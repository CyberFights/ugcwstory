const { API, FunctionBuilder, Utils } = require("easy-api.ts")

const api = new API({
    port: process.env.PORT || 3000,
  database: {
        enabled: true,
        type: 'mongo', // 'replit', 'mongo', 'default'
        mongoUrl: process.env.MONGO_URL
    }

})

   api.routes.load('./routes');

// easy-api.ts reads a bare dollar sign in the route code as the start of a
// function name, and it does that even for a dollar sign that travels inside a
// value: unpack() finds the LAST "$var" / "$if" / ... in the whole code, so a
// message carrying "$var" makes every $var resolve the value instead of its own
// header, warns "Invalid inside provided in: $var" and leaves the variables
// unset - battle-turn then answers 400 "Missing userid" for a userid that was
// sent. $getQuery / $getData escape brackets and semicolons of a value but not
// the dollar sign, so the sign is escaped here, once, for every getter that
// returns one: "$" -> "@dollar" on the way in, back on the way out ($send,
// $encodeURI, $math, ... all unescape before use). "@dollar" is unescaped
// before "@at" so a literal "@dollar" in the input survives the round trip.
String.prototype.escape = function () {
  return this
    .replaceAll('@', '@at')
    .replaceAll('$', '@dollar')
    .replaceAll(']', '@left')
    .replaceAll('[', '@right')
    .replaceAll(';', '@semi')
    .replaceAll(':', '@colon')
    .replaceAll('=', '@equal')
    .replaceAll('||', '@or')
    .replaceAll('&&', '@and')
    .replaceAll('>', '@higher')
    .replaceAll('<', '@lower');
};
String.prototype.unescape = function () {
  return this
    .replaceAll('@dollar', '$')
    .replaceAll('@at', '@')
    .replaceAll('@left', ']')
    .replaceAll('@right', '[')
    .replaceAll('@semi', ';')
    .replaceAll('@colon', ':')
    .replaceAll('@equal', '=')
    .replaceAll('@or', '||')
    .replaceAll('@and', '&&')
    .replaceAll('@higher', '>')
    .replaceAll('@lower', '<')
    .replaceAll('@left_parent', ')')
    .replaceAll('@right_parent', '(');
};

// $getVar crashes on anything that is not a string: move.js stores heights,
// weights and positions as numbers (hjson parses "183" to 183) and quickmongo
// returns them as numbers, then v.escape() throws "v.escape is not a function"
// and the request hangs with no response. Read every type through String() and
// report a missing key as "undefined" so $switch falls back to its default.
const getVarFn = api.interpreter.functions.find(f => f.data?.name?.toLowerCase() === 'getvar');
if (getVarFn) {
  getVarFn.code = async d => {
    let r = d.unpack(d);
    if (!d.interpreter.db) return Utils.Warn('No database set yet, error in:', d.func);
    if (!r.inside) return Utils.Warn('Invalid inside provided in:', d.func);
    let v = await d.interpreter.db.get(r.inside.unescape());
    let out;
    if (v === null || v === undefined) out = 'undefined';
    else if (typeof v === 'object') out = JSON.stringify(v, null, 2).escape() || 'undefined';
    else out = String(v).escape() || 'undefined';
    return {
      code: d.code.resolve(`${d.func}[${r.inside}]`, out)
    };
  };
}

// $hasVar has the same two problems: it looks the key up without unescaping it
// (a userid holding ";" or "$" is stored unescaped by $setVar and never found
// again) and it reports a stored 0 / false as missing. A key exists when the
// database returns anything but null / undefined.
const hasVarFn = api.interpreter.functions.find(f => f.data?.name?.toLowerCase() === 'hasvar');
if (hasVarFn) {
  hasVarFn.code = async d => {
    let r = d.unpack(d);
    if (!d.interpreter.db) return Utils.Warn('No database set yet, error in:', d.func);
    if (!r.inside) return Utils.Warn('Invalid inside provided in:', d.func);
    let v = await d.interpreter.db.get(r.inside.unescape());
    return {
      code: d.code.resolve(`${d.func}[${r.inside}]`, (v !== null && v !== undefined) ? 'true' : 'false')
    };
  };
}

// $deleteVar looks its key up raw as well, unescape it for the same reason.
const deleteVarFn = api.interpreter.functions.find(f => f.data?.name?.toLowerCase() === 'deletevar');
if (deleteVarFn) {
  deleteVarFn.code = async d => {
    let r = d.unpack(d);
    if (!d.interpreter.db) return Utils.Warn('No database set yet, error in:', d.func);
    if (!r.inside) return Utils.Warn('Invalid inside provided in:', d.func);
    await d.interpreter.db.delete(r.inside.unescape());
    return {
      code: d.code.resolve(`${d.func}[${r.inside}]`, '')
    };
  };
}
api.setSpaces(1)
api.interpreter.addFunction({
    data: new FunctionBuilder()
    .setName('download')
  .setValue('description', 'Downloads a file from the provided URL.')
  .setValue('use', '$download[url;filename]')
  .setValue('returns', 'Void'),
  code: async d => {
    let r = d.unpack(d);
    if (!r.inside) return Utils.Warn('Invalid inside provided in:', d.func);
    let [url, filename] = r.splits;
    if(!url || !url?.startsWith('https://')) return Utils.Warn('You need to provide the url and url must have a secure protocol: https', d.func);
    if(!filename) return Utils.Warn('Missing filename in:', d.func);
    const http = require('https');
    const fs = require('fs');
    const file = fs.createWriteStream(filename);
    const request = http.get(url, function(rsp) {
      rsp.pipe(file);
      file.on("finish", () => {
        file.close();
      });
    });
    return {
      code: d.code.resolve(`${d.func}[${r.inside}]`, '')
    };
  }
    })


api.interpreter.addFunction({
    data: new FunctionBuilder()
    .setName('httpPost')
  .setValue('description', 'Sends a JSON POST request. Body = inline JSON, or the object built with $createObject/$setObjectKey when omitted. The reply can be read with $getData[key] and, in object mode, the object becomes {status, request, response} for $send[..;safe].')
  .setValue('use', '$httpPost[url;json body?;...headers?]')
  .setValue('returns', 'Number (http status code, 0 when the request failed)'),
  code: async d => {
    let r = d.unpack(d);
    if (!r.inside) return Utils.Warn('Invalid inside provided in:', d.func);
    let [url, body, ...headers] = r.splits;
    if (!url || !url.unescape().startsWith('http')) return Utils.Warn('You need to provide a valid url in:', d.func);

    // "100" -> 100, "true" -> true so the remote API receives real types
    const coerce = v => {
      if (Array.isArray(v)) return v.map(coerce);
      if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = coerce(v[k]); return v; }
      if (typeof v !== 'string') return v;
      const t = v.trim();
      if (t === 'true') return true;
      if (t === 'false') return false;
      if (t === 'null' || t === 'undefined') return null;
      if (t !== '' && Utils.isNumber(t.replace('.', ''))) return Number(t);
      return v;
    };

    let data;
    const objectMode = !body || !body.trim();
    if (objectMode) {
      if (!d._.object) return Utils.Warn('No body and no object found, use $createObject first. In:', d.func);
      data = coerce(JSON.parse(JSON.stringify(d._.object).unescape()));
    } else {
      data = Utils.loadObject(body.unescape());
      if (!data) return Utils.Warn('Invalid JSON body provided in:', d.func);
    }

    let reqHeaders = { 'Content-Type': 'application/json' };
    for (const header of headers) {
      let h = header.unescape();
      let i = h.indexOf(':');
      if (i < 1) { Utils.Warn('Invalid header provided in:', d.func); continue; }
      reqHeaders[h.slice(0, i).trim()] = h.slice(i + 1).trim();
    }

    const axios = require('axios');
    let status = 0;
    let reply;
    const res = await axios({
      method: 'post',
      url: url.unescape(),
      data,
      headers: reqHeaders,
      timeout: 120000,
      validateStatus: () => true
    }).catch(e => {
      Utils.Warn(`Request failed (${e.message}) in:`, d.func);
      return null;
    });
    if (res) {
      status = res.status;
      reply = typeof res.data === 'object' && res.data !== null ? res.data : { response: res.data };
    } else {
      reply = { error: 'Request failed' };
    }
    // no stripping: $getData escapes the "$" to "@dollar", see above
    d._.request_data = reply;
    if (objectMode) d._.object = { status, request: data, response: reply };
    return {
      code: d.code.resolve(`${d.func}[${r.inside}]`, status.toString())
    };
  }
    })

api.interpreter.addFunction({
    data: new FunctionBuilder()
    .setName('httpGet')
  .setValue('description', 'Sends a GET request. The reply can be read with $getData[key]. Unlike $request it has a timeout and returns the http status code.')
  .setValue('use', '$httpGet[url;...headers?]')
  .setValue('returns', 'Number (http status code, 0 when the request failed)'),
  code: async d => {
    let r = d.unpack(d);
    if (!r.inside) return Utils.Warn('Invalid inside provided in:', d.func);
    let [url, ...headers] = r.splits;
    if (!url || !url.unescape().startsWith('http')) return Utils.Warn('You need to provide a valid url in:', d.func);

    let reqHeaders = { 'Accept': 'application/json' };
    for (const header of headers) {
      let h = header.unescape();
      let i = h.indexOf(':');
      if (i < 1) { Utils.Warn('Invalid header provided in:', d.func); continue; }
      reqHeaders[h.slice(0, i).trim()] = h.slice(i + 1).trim();
    }

    const axios = require('axios');
    let status = 0;
    let reply;
    // the timeout stays above the 120s the roleplay route gives wrestle-ai so
    // its own error payload arrives before this call gives up
    const res = await axios({
      method: 'get',
      url: url.unescape(),
      headers: reqHeaders,
      timeout: 150000,
      validateStatus: () => true
    }).catch(e => {
      Utils.Warn(`Request failed (${e.message}) in:`, d.func);
      return null;
    });
    if (res) {
      status = res.status;
      reply = typeof res.data === 'object' && res.data !== null ? res.data : { response: res.data };
    } else {
      reply = { error: 'Request failed' };
    }
    // no stripping: $getData escapes the "$" to "@dollar", see above
    d._.request_data = reply;
    return {
      code: d.code.resolve(`${d.func}[${r.inside}]`, status.toString())
    };
  }
    })

api.on('error', () => {null})

// We're connecting to the API when the source has been loaded

    api.connect()

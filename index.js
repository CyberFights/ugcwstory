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
    d._.request_data = reply;
    if (objectMode) d._.object = { status, request: data, response: reply };
    return {
      code: d.code.resolve(`${d.func}[${r.inside}]`, status.toString())
    };
  }
    })

api.on('error', () => {null})

// We're connecting to the API when the source has been loaded

    api.connect()

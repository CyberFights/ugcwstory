const { API, FunctionBuilder, Utils } = require("easy-api.ts")

const api = new API({
    port: process.env.PORT || 3000,
  database: {
        enabled: true,
        type: 'replit', // 'replit', 'mongo', 'default'
        // mongoUrl: '....'
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


api.on('error', () => {null})

// We're connecting to the API when the source has been loaded

    api.connect()
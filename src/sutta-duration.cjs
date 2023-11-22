(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const { logger, } = require('log-instance');
    const {
        Network,
    } = require('oya-ann');

    class SuttaDuration {
        constructor(opts={}) {
            this.name = opts.name || 'amy';
            var fname = `sutta-duration.${this.name}.json`;
            var netPath  = path.join(__dirname, fname);
            var json = JSON.parse(fs.readFileSync(netPath));
            this.network = Network.fromJSON(json);
        }

        measure(sutta, lang){
            const msg = 'SuttaDuration.measure()';
            if (lang == null) {
              lang = sutta.lang === 'en' ? 'en' : 'ref';
            }
            var nSections = sutta.sections.length;
            var segments = sutta.segments;
            var nSegments = segments.length;
            var nEmptySegments = 0;
            var text = 0;
            for (var i = 0; i < nSegments; i++) {
                var segment = segments[i];
                var segText = segment[lang];
                if (segText && segText.trim()) {
                    text += segText.length;
                } else {
                    nEmptySegments++;
                }
            }
            var lst = Math.log(nSegments/nSections);
            var et = nEmptySegments  / (nSections * lst);
            var logistic = (x, x0, k) => 1 / (1 + Math.exp(-k*(x - x0)));
            var cet = logistic(et, .679, 18);
            if (nSegments > 1000) {
              // DN16 de returns negative seconds
              // so we set cet to a middle value between 0 and 1
              cet = 0.5; 
            }
            var dataToTarget = d => [ d.elapsed/d.text.en ];
            var resAct = this.network.activate([
                (1-cet) * text,
                cet * text,
                Math.log(nSegments-nEmptySegments+1),
            ]);
            var seconds = resAct[0] * text/1000;
            let result =  {
                text,
                lang,
                nSegments,
                nEmptySegments,
                nSections,
                seconds,
            };
            //console.log(msg, {result, cet, et, lst});
            return result;
        }
    }

    module.exports = exports.SuttaDuration = SuttaDuration;
})(typeof exports === "object" ? exports : (exports = {}));


(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"), require("promiseland"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "promiseland"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror, promiseland) {
  "use strict";
  // declare global: JSHINT
  
  var parser = new promiseland.Parser();

  
  function validator(text, options) {
    var output = [];
    
    parser.parse(text).then(function(r){
      var i;
      var l;
      var w;
      if (r && r.warnings){
        i = 0;
        l = r.warnings.length;
        for (i; i < l; ++i){
          w = r.warnings[i];
          output.push({
            message: w.msg,
            severity: "warning",
            from: CodeMirror.Pos(w.line - 1, w.column - 1),
            to: CodeMirror.Pos(w.line - 1, w.column + 1)
          });
        };
      };
      if (r && r.errors){
        i = 0;
        l = r.errors.length;
        for (i; i < l; ++i){
          w = r.errors[i];
          output.push({
            message: w.msg,
            severity: "error",
            from: CodeMirror.Pos(w.line - 1, w.column - 1),
            to: CodeMirror.Pos(w.line - 1, w.column + 1)
          });
        };
      };
    }, function(err){
      var line = err.line || 1;
      var column = err.column || 1;
      output.push({
        message: "parse error: " + err.msg,
        severity: "error",
        from: CodeMirror.Pos(line - 1, column - 1),
        to: CodeMirror.Pos(line - 1, column + 1)
      });
    });
    return output;
  }

  CodeMirror.registerHelper("lint", "promiseland", validator);

});

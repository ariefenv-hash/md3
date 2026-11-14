(function(){"use strict";function t(r){return(r.match(/[A-Za-z0-9_'\-]+/g)||[]).length+(r.match(/[\u4e00-\u9fff]/g)||[]).length}function o(r){var a=(r||"\u672A\u547D\u540D").trim().replace(/\.md(x)?$/i,"");return a=a.replace(/[\\/:*?"<>|]/g,"_").replace(/\s+/g," ").slice(0,60)||"\u672A\u547D\u540D",a}function d(r,a){var n=Math.abs(r-a),e=n===0?1:Math.max(0,1-n*.45),l=n===0?.88:1-.05*e,p=n===0?0:(r<a?1:-1)*2*e;return{shift:p,sc:l,radius:10+(n===0?5:3)*e,z:n===0?"1":""}}function i(r){return Math.min(.78,Math.max(.22,r))}function m(r,a){return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>`+a+`</title>
<style>
body{font-family:var(--md-font,system-ui,-apple-system,"Noto Sans SC",sans-serif);max-width:760px;margin:0 auto;padding:32px 20px;line-height:1.75;color:var(--md-on-surface,#1c1b1f);background:var(--md-surface,#fefbff);}
h1,h2{border-bottom:1px solid var(--md-outline-variant,#e2e2e9);padding-bottom:.25em;}
code{background:var(--md-surface-container,#f2f2f7);border-radius:var(--md-r-sm,6px);padding:.1em .4em;}
pre{background:var(--md-surface-container,#f2f2f7);border-radius:var(--md-r-lg,12px);padding:12px 14px;overflow-x:auto;}
pre code{background:transparent;padding:0;}
blockquote{border-left:3px solid var(--md-primary,#6750a4);background:var(--md-surface-container-low,#f3eefc);margin:.7em 0;padding:.45em .95em;}
table{border-collapse:collapse;}th,td{border:1px solid var(--md-outline-variant,#ddd);padding:6px 10px;}
img{max-width:100%;}
</style>
</head>
<body>
`+r+`
  <script src="../_shared/idle-slider.js"><\/script>
</body>
</html>
`}function c(r){return(r||[]).filter(function(a){return/\.md$/i.test(a&&a.name||a.path||"")}).map(function(a){return{name:a.name||(a.path||"").split("/").pop(),size:a.size}})}function s(r){return r!=null?r<1024?r+" B":(r/1024).toFixed(1)+" KB":""}var f={countWords:t,safeNameOf:o,pressTransform:d,clampSplit:i,buildExportPage:m,normalizeMdDocs:c,fmtDocSize:s};typeof window<"u"&&(window.__markdownCore=f)})();

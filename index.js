let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let fs = require("fs");

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

let quillFilePath = require.resolve('quill');
let quillMinFilePath = quillFilePath.replace('quill.js', 'quill.min.js');
let quillLibrary = fs.readFileSync(quillMinFilePath);

const JSDOM_TEMPLATE = `
  <div id="editor">hello</div>
  <script>${quillLibrary}</script>
  <script>
    document.getSelection = function() {
      return {
        getRangeAt: function() { }
      };
    };
    document.attachEvent = function(event) {
      return {
        getRangeAt: function() { }
      };
    };
    document.execCommand = function (command, showUI, value) {
      try {
          return document.execCommand(command, showUI, value);
      } catch(e) {}
      return false;
    };
  </script>
`;
const JSDOM_OPTIONS = { userAgent: "Mellblomenator/9000", runScripts: 'dangerously', resources: 'usable' };

const DOM = new JSDOM(JSDOM_TEMPLATE, JSDOM_OPTIONS);

const QUILL = new DOM.window.Quill('#editor', {
    formats: ['bold', 'italic', 'header', 'list'],
    modules: {
        clipboard: {
            matchVisual: false
        },
    }
});

const port = 3000;
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
app.use(bodyParser.json());

app.post('/parse-html', function (req, res) {

    if (req.body.html === undefined) {
        res.status(500).json({ error: 'Not found html param in request' })
    }

    let delta = QUILL.clipboard.convert(req.body.html);
    QUILL.setContents(delta);

    let tempHtml;
    let html = QUILL.root.innerHTML;

    do {
        tempHtml = html;
        html = html.replace(/^<p><br><\/p>/,'');
        delta = QUILL.clipboard.convert(html);
        QUILL.setContents(delta);
        html = QUILL.root.innerHTML
    } while (html !== tempHtml);

    res.json({
        'text': QUILL.getText(),
        'html': html
    });
});

let server = app.listen(port, function () {
    let host = server.address().address
    let port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
});
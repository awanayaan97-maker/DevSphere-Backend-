
const { convert } = require("html-to-text");

const MAX_CHARS = 12000; 

function htmlToText(html = "") {

    const text = convert(html, {
        wordwrap: false,
        selectors: [
            { selector: "script", format: "skip" },
            { selector: "style", format: "skip" },
            { selector: "img", format: "skip" },
            { selector: "a", options: { ignoreHref: true } }
        ]
    });

    const clean = text.trim();

    return clean.length > MAX_CHARS ? clean.slice(0, MAX_CHARS) : clean;
}

module.exports = htmlToText;

const cheerio = require("cheerio");

function stripHTML(content) {
    return content.replace(/<[^>]*>/g, " ");
}

function calculateReadTime(text) {
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / 200);
}

function extractHeadings(html) {
    const $ = cheerio.load(html);
    const headings = [];

    $("h2, h3").each((i, el) => {
        const text = $(el).text();
        const id = text.toLowerCase().trim().replace(/\s+/g, "-");
        const level = el.tagName;

        headings.push({ text, id, level });
    });

    return headings;
}

module.exports = { stripHTML, calculateReadTime, extractHeadings }
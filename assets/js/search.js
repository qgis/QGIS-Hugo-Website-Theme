{{/* Note: This file needs to be rendered as a template in HUGO
     in order to ensure urls referenced are correct. See header.html in layouts
     for template rendering implementation. TS */}}

var maxResults = 30;

var fuseKeys = [
    {name: "title", weight: 0.5},
    {name: "page", weight: 0.2},
    {name: "contents", weight: 0.25},
    {name: "tags", weight: 0.05}
];

var fuseOptions = {
    shouldSort: true,
    includeMatches: true,
    includeScore: true,
    // index.json holds one entry per page section, so `contents` is still long.
    // ignoreLocation keeps matches deep inside a section from being penalised
    // out of the results, and ignoreFieldNorm keeps long sections from being
    // outranked by short ones purely because of their length.
    ignoreLocation: true,
    ignoreFieldNorm: true,
    threshold: 0.3,
    minMatchCharLength: 3,
    keys: fuseKeys
};

// =============================
// Search
// =============================

var inputBox = document.getElementById('search-query');
if (inputBox !== null) {
    var searchQuery = param("q");
    if (searchQuery) {
        inputBox.value = searchQuery || "";
        echoQuery(searchQuery);
        executeSearch(searchQuery, false);
    } else {
        var results = document.getElementById('search-results')
        if (results != null) {
            results.innerHTML =
            '<p class="search-results-empty">{{ i18n "searchPrompt" }} <a href="{{ "tags/" | absURL }}">{{ i18n "searchAllTags" }}</a></p>';
        }
    }
}

// Show the visitor which words produced the results they are looking at.
function echoQuery(searchQuery) {
    var echo = document.getElementById('search-header-query');
    if (echo !== null) {
        echo.textContent = '“' + searchQuery + '”';
    }
}

function reportResultCount(count) {
    var element = document.getElementById('search-header-count');
    if (element !== null) {
        element.textContent = count + ' ' + '{{ i18n "searchResultsCount" }}';
    }
}

function executeSearch(searchQuery) {

    show(document.querySelector('.search-loading'));

    fetch('{{ "index.json" | absURL }}').then(function (response) {
        if (response.status !== 200) {
            console.log('Looks like there was a problem. Status Code: ' + response.status);
            return;
        }
        // Examine the text in the response
        response.json().then(function (pages) {
            var fuse = new Fuse(pages, fuseOptions);
            var result = runSearch(fuse, searchQuery);
            reportResultCount(result.length);
            if (result.length > 0) {
                populateResults(result);
            } else {
                document.getElementById('search-results').innerHTML =
                '<p class="search-results-empty">{{ i18n "searchNoResults" }}</p>';
            }

            hide(document.querySelector('.search-loading'));
        })
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
    });
}

// Split a query into the words worth matching on their own.
function tokenize(searchQuery) {
    return searchQuery.trim().split(/\s+/).filter(token => token.length > 1);
}

function runSearch(fuse, searchQuery) {
    // Fuse matches the query as one contiguous phrase. That is precise, but it
    // misses re-ordered or padded phrasings such as "how do I cite QGIS", so
    // when the phrase search comes back thin we widen it to entries that match
    // every token somewhere. Phrase hits stay first because they rank better.
    var results = fuse.search(searchQuery, {limit: maxResults});
    var searchTokens = tokenize(searchQuery);

    if (results.length < 10 && searchTokens.length > 1) {
        var seen = {};
        results.forEach(function (result) {
            seen[result.item.permalink] = true;
        });

        var everyToken = searchTokens.map(function (token) {
            return {
                $or: fuseKeys.map(function (key) {
                    var clause = {};
                    clause[key.name] = token;
                    return clause;
                })
            };
        });

        fuse.search({$and: everyToken}, {limit: maxResults}).forEach(function (result) {
            if (!seen[result.item.permalink] && results.length < maxResults) {
                seen[result.item.permalink] = true;
                results.push(result);
            }
        });
    }

    return results.slice(0, maxResults);
}

function populateResults(results) {
    var searchQuery = document.getElementById("search-query").value;
    var searchResults = document.getElementById("search-results");

    // Clear previous results
    searchResults.innerHTML = "";

    // Tokenize the search query to handle multiple words
    var searchTokens = tokenize(searchQuery);

    // Pull template from Hugo template definition
    var templateDefinition = document.getElementById("search-result-template").innerHTML;

    results.forEach(function (value, key) {
        var snippet = createSnippet(value.item.contents, searchQuery, searchTokens);

        // Replace values for tags
        var tags = "";
        if (value.item.tags) {
            value.item.tags.forEach(function (element) {
                tags += "<span class='tag is-warning'><a href='/tags/" + element + "'>" + element + "</a></span> ";
            });
        }
        
        // Replace values for categories
        var categories = "";
        if (value.item.categories) {
            value.item.categories.forEach(function (element) {
                categories += "<span class='tag is-danger'><a href='/categories/" + element + "'>" + element + "</a></span> ";
            });
        }

        // Results are page sections, and the same heading can appear on many
        // pages ("Programmability" on every visual changelog), so name the page
        // the section belongs to. Page-level entries already carry that title.
        var context = "";
        if (value.item.page && value.item.page !== value.item.title) {
            context = value.item.page;
        }

        // Render the output using the template
        searchResults.innerHTML += render(templateDefinition, {
            key: key,
            title: value.item.title,
            context: context,
            link: value.item.permalink,
            tags: tags,
            categories: categories,
            snippet: snippet
        });

        // Highlight the query tokens within the snippet
        if (searchTokens.length > 0) {
            new Mark(document.getElementById('summary-' + key)).mark(searchTokens);
        }
    });
}

// Cut a window of text around the most specific part of the query that the
// section actually contains, so the snippet shows why the result matched.
function createSnippet(contents, searchQuery, tokens) {
    const snippetLength = 200;
    let start = 0;
    let end = snippetLength;

    // Prefer the whole phrase, then the longest token that is present, so that
    // a common word like "to" cannot pull the window away from the real match.
    const needles = [searchQuery.trim()].concat(
        tokens.slice().sort((a, b) => b.length - a.length)
    );
    const haystack = contents.toLowerCase();
    for (const needle of needles) {
        const position = haystack.indexOf(needle.toLowerCase());
        if (position > -1) {
            start = Math.max(0, position - 50);
            end = Math.min(contents.length, position + snippetLength - 50);
            break;
        }
    }

    let snippet = contents.substring(start, end);
    if (start > 0) {
        snippet = '&hellip;' + snippet;
    }
    if (end < contents.length) {
        snippet += '&hellip;';
    }
    return snippet;
}

function render(templateString, data) {
    var conditionalMatches, conditionalPattern, copy;
    conditionalPattern = /\$\{\s*isset ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g;
    //since loop below depends on re.lastInxdex, we use a copy to capture any manipulations whilst inside the loop
    copy = templateString;
    while ((conditionalMatches = conditionalPattern.exec(templateString)) !== null) {
        if (data[conditionalMatches[1]]) {
            //valid key, remove conditionals, leave contents.
            copy = copy.replace(conditionalMatches[0], conditionalMatches[2]);
        } else {
            //not valid, remove entire section
            copy = copy.replace(conditionalMatches[0], '');
        }
    }
    templateString = copy;
    //now any conditionals removed we can do simple substitution
    var key, find, re;
    for (key in data) {
        find = '\\$\\{\\s*' + key + '\\s*\\}';
        re = new RegExp(find, 'g');
        templateString = templateString.replace(re, data[key]);
    }
    return templateString;
}

// Helper Functions
function show(elem) {
    elem.style.display = 'block';
}
function hide(elem) {
    elem.style.display = 'none';
}
function param(name) {
    return decodeURIComponent((location.search.split(name + '=')[1] || '').split('&')[0]).replace(/\+/g, ' ');
}

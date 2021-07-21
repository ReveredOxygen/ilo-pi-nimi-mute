window.onload = async function() {
    window.dictionary = await (await fetch('./data/dictionary.json')).json()

    window.fuseBilingual = new Fuse(dictionary, {
        keys: [
            {
                name: 'word',
                weight: 2
            },
            'definitions.definition'
        ],
        includeMatches: true,
        findAllMatches: true,
        distance: Number.MAX_SAFE_INTEGER,
        threshold: 0.1,
    })
    window.fuseTokiPona = new Fuse(dictionary, {
        keys: ['word'],
        includeMatches: true,
        findAllMatches: true,
        distance: Number.MAX_SAFE_INTEGER,
        threshold: 0.1,
    })
    window.fuseEnglish = new Fuse(dictionary, {
        keys: ['definitions.definition'],
        includeMatches: true,
        findAllMatches: true,
        distance: Number.MAX_SAFE_INTEGER,
        threshold: 0.1,
    })

    onSearchUpdate()
}

function onSearchUpdate() {
    let query = document.getElementById('searchbar').value

    if (query.startsWith('!i ') || query.startsWith('!e ')) {
        var fuse = fuseEnglish
        query = query.substring(3)
    }
    else if (query.startsWith('!t ')) {
        var fuse = fuseTokiPona
        query = query.substring(3)
    }
    else {
        var fuse = fuseBilingual
    }

    let results = fuse.search(query)

    placeHtml(dictionary, results, query)
}

function placeHtml(entries, results, query) {
    let list = document.getElementById('results')
    list.textContent = ''

    if (!query) {
        for (const entry of entries) {
            html = generateHtml(entry)

            let listItem = document.createElement('li')
            listItem.appendChild(html)

            list.appendChild(listItem)
        }
    }

    for (const result of results) {
        html = generateHtml(result.item, result)

        let listItem = document.createElement('li')
        listItem.appendChild(html)

        list.appendChild(listItem)
    }
}

function generateHtml(entry, match) {
    let div = document.createElement('div')

    let wordHtml = document.createTextNode(entry.word)
    div.appendChild(wordHtml)

    let tagsStr = '('
    for (let i = 0; i < entry.tags.length; i++) {
        tagsStr += entry.tags[i]
        if (i < entry.tags.length - 1) {
            tagsStr += ', '
        }
    }
    tagsStr += ')'

    let tagsHtml = document.createTextNode(tagsStr)
    div.appendChild(tagsHtml)

    div.appendChild(genDefinitionTable(entry, match))

    return div
}

function genDefinitionTable(entry, match) {
    let table = document.createElement('table')
    let body = document.createElement('tbody')
    table.appendChild(body)

    for (definition of entry.definitions) {
        pushDefinition(body, definition)
    }

    if (match) {
        rows = []
        for (i = 0; i < match.matches.length; i++) {
            if (match.matches[i].key !== 'definitions.definition') {
                break
            }

            row = match.matches[i].refIndex
            rows.push(body.rows[row])
            body.deleteRow(row)
        }

        for (row of rows) {
            body.prepend(row)
        }
    }

    return table
}

function pushDefinition(table, definition) {
    let row = document.createElement('tr')
    table.appendChild(row)

    let wordCell = document.createElement('td')
    row.appendChild(wordCell)

    wordHtml = document.createTextNode(definition.definition)
    wordCell.appendChild(wordHtml)

    let scoreCell = document.createElement('td')
    row.appendChild(scoreCell)

    meterHtml = document.createElement('meter')
    meterHtml.max = 100
    meterHtml.min = 0
    meterHtml.value = definition.score
    scoreCell.appendChild(meterHtml)
}

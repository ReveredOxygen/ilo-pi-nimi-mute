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

            let line = document.createElement('hr')
            listItem.appendChild(line)

            list.appendChild(listItem)
        }
    }

    for (const result of results) {
        html = generateHtml(result.item, result)

        let listItem = document.createElement('li')
        listItem.appendChild(html)

        let line = document.createElement('hr')
        listItem.appendChild(line)

        list.appendChild(listItem)
    }
}

function generateHtml(entry, match) {
    let div = document.createElement('div')

    let longHtml = generateLongHtml(entry, match)
    let summaryHtml = generateSummaryHtml(entry, match)

    div.appendChild(summaryHtml)
    div.appendChild(longHtml)

    return div
}

function generateSummaryHtml(entry, match) {
    let div = document.createElement('p')
    div.onclick = toggleLongView
    div.className = 'summary-entry'

    let wordHtml = document.createElement('b')
    wordHtml.textContent = entry.word
    div.appendChild(wordHtml)

    let tagsHtml = document.createElement('em')
    tagsHtml.innerHTML = ' ' + formatTags(entry.tags)
    div.appendChild(tagsHtml)

    let seperator = document.createElement('span')
    seperator.innerHTML = '&ensp;&mdash;&ensp;'
    div.appendChild(seperator)

    let definitonsHtml = document.createElement('span')
    div.appendChild(definitonsHtml)

    let definitionsList = []
    for (const definition of entry.definitions) {
        definitionsList.push(`${definition.definition}<sup>${frequencyToIndex(definition.score)}</sup>`)
    }

    if (match) {
        let removed = []
        for (i = 0; i < match.matches.length; i++) {
            if (match.matches[i].key !== 'definitions.definition') {
                break
            }

            index = match.matches[i].refIndex
            removed.push(definitionsList.splice(index, 1))
        }

        definitionsList = [...removed, ...definitionsList]
    }

    definitonsHtml.innerHTML = definitionsList.join(',&nbsp; ')

    return div
}

function toggleLongView() {
    style = this.nextElementSibling.style

    console.log(this.nextElementSibling)
    console.log(style.display)
    if (style.display === '') {
        style.display = 'none'
    }
    else {
        style.display = null
    }
}

function formatTags(tags) {
    let out = '('
    for (let i = 0; i < tags.length; i++) {
        out += tags[i]
        if (i < tags.length - 1) {
            out += ', '
        }
    }
    out += ')'

    return out
}

function frequencyToIndex(frequency) {
    return frequency > 80 ? '5' :
        frequency > 60 ? '4' :
            frequency > 40 ? '3' :
                frequency > 20 ? '2' :
                    frequency > 10 ? '1' :
                        '½'
}

function generateLongHtml(entry, match) {
    let div = document.createElement('div')
    div.style.display = 'none'
    div.className = 'entry'

    let wordHtml = document.createElement('h1')
    wordHtml.textContent = entry.word
    wordHtml.className = 'tp-word'
    div.appendChild(wordHtml)


    let tagsHtml = document.createElement('div')
    tagsHtml.textContent = formatTags(entry.tags)
    tagsHtml.className = 'tags'
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
    wordCell.className = 'definition-cell'
    row.appendChild(wordCell)

    wordHtml = document.createTextNode(definition.definition)
    wordHtml.className = 'definition'
    wordCell.appendChild(wordHtml)

    let scoreCell = document.createElement('td')
    scoreCell.className = 'score-cell'
    row.appendChild(scoreCell)

    meterHtml = document.createElement('meter')
    meterHtml.className = 'score-meter'
    meterHtml.max = 100
    meterHtml.min = 0
    meterHtml.value = definition.score
    scoreCell.appendChild(meterHtml)
}

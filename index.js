window.onload = async function() {
    window.dictionary = await (await fetch('./data/dictionary.json')).json()

    const params = new URLSearchParams(location.hash.substring(1))
    if (params.has('alasa')) {
        document.getElementById('searchbar').value = params.get('alasa')
    }
    if (params.has('nimi')) {
        var word = params.get('nimi')
    }

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

    onSearchUpdate(word)
}

function onSearchUpdate(jumpToWord) {
    let query = document.getElementById('searchbar').value

    params = new URLSearchParams(location.hash.substring(1))
    if (query != '') {
        params.set('alasa', query)
    }
    else {
        params.delete('alasa')
    }
    location.hash = params.toString()

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

    let placed = placeHtml(dictionary, results, query)

    if (!jumpToWord) {
        return
    }

    let index = placed.findIndex(x => x.word == jumpToWord)
    if (index === -1) {
        return
    }

    let list = document.getElementById('results')

    let elemToMove = list.childNodes[index]
    list.removeChild(elemToMove)
    list.prepend(elemToMove)
    elemToMove.classList.add('highlighted-result')
    toggleLongView.bind(elemToMove.firstChild.firstChild)()
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

        return entries
    }

    for (const result of results) {
        html = generateHtml(result.item, result)

        let listItem = document.createElement('li')
        listItem.appendChild(html)

        let line = document.createElement('hr')
        listItem.appendChild(line)

        list.appendChild(listItem)
    }

    return results.map(x => x.item)
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
    let container = document.createElement('div')
    container.className = 'summary-container'

    let div = document.createElement('p')
    div.onclick = toggleLongView
    div.className = 'summary-entry'
    container.appendChild(div)

    let expandIndicator = document.createElement('span')
    expandIndicator.innerHTML = '▾&ensp;'
    expandIndicator.className = 'expand-indicator'
    div.appendChild(expandIndicator)

    let wordHtml = document.createElement('b')
    wordHtml.textContent = entry.word
    div.appendChild(wordHtml)

    let tagsHtml = document.createElement('em')
    tagsHtml.innerHTML = ' ' + formatTags(entry.tags)
    div.appendChild(tagsHtml)

    let definitionsContainer = document.createElement('span')
    definitionsContainer.className = 'summary-definitions-container'
    div.appendChild(definitionsContainer)

    let seperator = document.createElement('span')
    seperator.innerHTML = '&ensp;&mdash;&ensp;'
    seperator.className = 'summary-seperator'
    definitionsContainer.appendChild(seperator)

    let definitonsHtml = document.createElement('span')
    definitonsHtml.className = 'summary-definitions'
    definitionsContainer.appendChild(definitonsHtml)

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

    linkHtml = document.createElement('img')
    linkHtml.className = 'copy-link'
    linkHtml.src = 'link.svg'
    linkHtml.width = 32
    linkHtml.onclick = () => {
        params = new URLSearchParams(location.hash.substring(1))
        params.set('nimi', entry.word)
        url = location.origin + location.pathname + '#' + params.toString()
        navigator.clipboard.writeText(url).then(() => alert('Copied link to clipboard: ' + url))
    }
    container.appendChild(linkHtml)

    return container
}

function toggleLongView() {
    style = this.parentElement.nextElementSibling.style
    indicator = this.firstChild

    if (style.display === '') {
        style.display = 'none'
        indicator.innerHTML = '▾&ensp;'
        this.classList.remove('summary-expanded')
    }
    else {
        style.display = null
        indicator.innerHTML = '▴&ensp;'
        this.classList.add('summary-expanded')
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
    return frequency == null ? 'n/a' :
        frequency > 80 ? '5' :
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

    /*
    let wordHtml = document.createElement('h1')
    wordHtml.textContent = entry.word
    wordHtml.className = 'tp-word'
    div.appendChild(wordHtml)

    let tagsHtml = document.createElement('div')
    tagsHtml.textContent = formatTags(entry.tags)
    tagsHtml.className = 'tags'
    div.appendChild(tagsHtml)
    */

    if (entry['nimi-ale-pona-definition'] != null) {
        let nimiAlePonaDef = document.createElement('p')
        nimiAlePonaDef.textContent = 'kon tan nimi ale pona li ni: ' + entry['nimi-ale-pona-definition']
        nimiAlePonaDef.className = 'nimi-ale-pona-definition'
        div.appendChild(nimiAlePonaDef)
    }

    if (entry.etymology != null) {
        etymology = entry.etymology.etymology
        let etymologyHtml = document.createElement('p')
        etymologyHtml.textContent = 'nimi li ' +
            (etymology != null ? 'tan ni ' : '') +
            'tan ' +
            entry.etymology.language +
            (etymology != null ? ': ' + etymology : '')
        etymologyHtml.className = 'etymology'
        div.appendChild(etymologyHtml)
    }

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
    if (definition.score == null) {
        meterHtml.value = 100
        meterHtml.low = 100
    }
    else {
        meterHtml.value = definition.score
    }
    scoreCell.appendChild(meterHtml)
}

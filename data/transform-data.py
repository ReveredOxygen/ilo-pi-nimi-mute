#!/usr/bin/env python3

import json
import csv

NIMI_KU_SULI = ['namako', 'kin', 'oko', 'kipisi', 'leko', 'monsuta', 'misikeke', 'tonsi', 'jasima', 'soko', 'meso', 'epiku', 'kokosila', 'lanpan', 'n', 'kijetesantakalu', 'ku']

def parse_jan_sonja(raw_data: str):
    lines = raw_data.splitlines()
    lines = filter(lambda x: not x.startswith('#') and len(x) > 1, lines)
    lines = map(lambda x: x.replace('"', '').strip(), lines)

    entries = {}
    for line in lines:
        split = line.split(': [', 2)
        word = split[0]
        data = split[1][:-1]

        definitions = []
        for segment in data.split(', '):
            split = segment.split(' ')
            definition = str.join(' ', split[:-1])
            score = int(split[-1])

            definitions.append({'definition': definition, 'score': score})

        entries[word] = {'definitions': definitions}

    return entries

def transform_proper_names(raw_data: dict[str, str]):
    for key in list(raw_data):
        if key[0].isupper() or key == 'toki pona':
            raw_data.pop(key)

    output = {}
    for key, value in raw_data.items():
        output[key] = {
            'definitions': [
                {
                    'definition': value,
                    'score': None
                }
            ],
            'tags': {'nimi pi toki pona ala'}
        }

    return output

def add_nimi_ale_pona(words):
    with open('sources/nimi-ale-pona.csv', newline='') as file:
        reader = csv.reader(file)
        next(reader) # Skip the header
        for row in reader:
            if row[0] == 'ale, ali':
                row[0] = 'ale'
                add_one_nimi_pi_nimi_ale_pona(words, row)
                row[0] = 'ali'
                add_one_nimi_pi_nimi_ale_pona(words, row)

            add_one_nimi_pi_nimi_ale_pona(words, row)

def add_one_nimi_pi_nimi_ale_pona(words, new_word):
    existing = words.get(new_word[0])

    categories = set()

    if new_word[1] == 'pu':
        categories.add('nimi pu')
    else:
        categories.add('nimi pi pu ala')
        categories.add('nimi pi sin ala' if new_word[1] == 'pre-pu' else 'nimi sin')

    if new_word[5] == 'word of Sonja':
        categories.add('nimi pi jan Sonja')

    if new_word[6] == 'nimi nanpa':
        categories.add('nimi nanpa')

    if existing is None:
        words[new_word[0]] = {
            'definitions': [
                {'definition': new_word[2], 'score': None}
            ],
            'tags': set()
        }
        existing = words[new_word[0]]

    existing['nimi-ale-pona-definition'] = new_word[2]
    existing['tags'] |= categories

    etymology = {}
    etymology['language'] = new_word[3]
    etymology['etymology'] = new_word[4] if new_word[4] != '' else None

    if etymology['language'] == 'onomatopoeia':
        etymology['language'] = 'kalama mu'
    if etymology['language'] == 'unknown':
        etymology['language'] = 'toki pi sona ala'
    if etymology['language'] == 'multiple':
        etymology['language'] = 'toki mute'
    if etymology['language'] == 'multiple possibilities':
        etymology['language'] = 'ken mute'
    if etymology['language'] == 'a priori':
        etymology['language'] = 'tan ona taso'

    existing['etymology'] = etymology

def transform_data():
    with open('sources/jan-sonja/nimi_pi_pu_ala.txt') as f:
        nimi_pi_pu_ala = parse_jan_sonja(f.read())

        nimi_pi_pu_ala['ku'] = {
                'definitions': [
                    {'definition': 'iteract with Toki Pona Dictionary', 'score': None}
                ]
            }

        for v in nimi_pi_pu_ala.values():
            v['tags'] = {'nimi pi pu ala'}

        nimi_ku_suli = {}
        for k in NIMI_KU_SULI:
            try:
                v = nimi_pi_pu_ala.pop(k)
                v['tags'] = {'nimi ku suli', 'nimi pi pu ala'}
                nimi_ku_suli[k] = v
            except KeyError:
                pass

    with open('sources/jan-sonja/nimi_pu.txt') as f:
        nimi_pu = parse_jan_sonja(f.read())

        for v in nimi_pu.values():
            v['tags'] = {'nimi pu'}

        for k in NIMI_KU_SULI:
            try:
                v = nimi_pu.pop(k)
                v['tags'] = {'nimi ku suli', 'nimi pu'}
                nimi_ku_suli[k] = v
            except KeyError:
                pass

    with open('sources/jan-sonja/compounds.txt') as f:
        nimi_mute = parse_jan_sonja(f.read())

        for key in nimi_pu.keys():
            # Try/except is needed because some nimi ku suli are in nimi_pu.txt but not compounds.txt
            try:
                nimi_mute.pop(key)
            except KeyError:
                pass

        for key in nimi_pi_pu_ala.keys():
            # Try/except is needed because some nimi ku suli are in nimi_pu.txt but not compounds.txt
            try:
                nimi_mute.pop(key)
            except KeyError:
                pass

        for key in nimi_ku_suli.keys():
            # Try/except is needed because some nimi ku suli are in nimi_pu.txt but not compounds.txt
            try:
                nimi_mute.pop(key)
            except KeyError:
                pass

        for v in nimi_mute.values():
            v['tags'] = {'nimi mute'}

    with open('sources/ilo-salana/proper_names.json') as f:
        data = json.load(f)
        proper_names = transform_proper_names(data)

    words_dict = nimi_pu
    words_dict.update(nimi_ku_suli)
    words_dict.update(nimi_pi_pu_ala)
    words_dict.update(nimi_mute)
    words_dict.update(proper_names)

    add_nimi_ale_pona(words_dict)

    words = []
    for word, definition in words_dict.items():
        definition['word'] = word

        definition['definitions'] = definition.pop('definitions')
        definition['tags'] = list(definition.pop('tags'))

        words.append(definition)

    for word in words:
        word['tags'].sort(key=lambda tag: {
            'nimi mute': 0,
            'nimi pi toki pona ala': 0,
            'nimi ku suli': 10,
            'nimi pu': 20,
            'nimi pi pu ala': 20,
            'nimi sin': 30,
            'nimi pi sin ala': 30,
            'nimi nanpa': 40,
            'nimi pi jan Sonja': 50
        }[tag])

    words.sort(key=lambda entry: list(filter(lambda x: x is not None, map(lambda tag: {
        'nimi pu': 10,
        'nimi ku suli': 20,
        'nimi pi sin ala': 30,
        'nimi sin': 40,
        'nimi pi pu ala': 50,
        'nimi mute': 60,
        'nimi pi toki pona ala': 70,
        'nimi nanpa': None,
        'nimi pi jan Sonja': None
    }[tag], entry['tags']))))

    return words

if __name__ == '__main__':
    data = transform_data()

    with open('dictionary.json', 'w') as f:
        json.dump(data, f, separators=(',', ':'))

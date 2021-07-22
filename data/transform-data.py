#!/usr/bin/env python3

import json

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
                    'score': 100
                }
            ],
            'tags': ['nimi pi toki pona ala']
        }

    return output

def transform_data():
    with open('sources/jan-sonja/nimi_pi_pu_ala.txt') as f:
        nimi_pi_pu_ala = parse_jan_sonja(f.read())

        nimi_pi_pu_ala['ku'] = {
                'definitions': [
                    {'definition': 'iteract with "Toki Pona Dictionary"', 'score': 100}
                ]
            }

        for v in nimi_pi_pu_ala.values():
            v['tags'] = ['nimi pi pu ala']

        nimi_ku_suli = {}
        for k in NIMI_KU_SULI:
            try:
                v = nimi_pi_pu_ala.pop(k)
                v['tags'] = ['nimi ku suli', 'nimi pi pu ala']
                nimi_ku_suli[k] = v
            except KeyError:
                pass

    with open('sources/jan-sonja/nimi_pu.txt') as f:
        nimi_pu = parse_jan_sonja(f.read())

        for v in nimi_pu.values():
            v['tags'] = ['nimi pu']

        for k in NIMI_KU_SULI:
            try:
                v = nimi_pu.pop(k)
                v['tags'] = ['nimi ku suli', 'nimi pu']
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
            v['tags'] = ['nimi mute']

    with open('sources/ilo-salana/proper_names.json') as f:
        data = json.load(f)
        proper_names = transform_proper_names(data)

    words_dict = nimi_pu
    words_dict.update(nimi_ku_suli)
    words_dict.update(nimi_pi_pu_ala)
    words_dict.update(nimi_mute)
    words_dict.update(proper_names)

    words = []
    for word, definition in words_dict.items():
        definition['word'] = word

        # Reorganize the order in the list. Not really necessary, but doesn't hurt much
        definition['definitions'] = definition.pop('definitions')
        definition['tags'] = definition.pop('tags')

        words.append(definition)

    return words

if __name__ == '__main__':
    data = transform_data()

    with open('dictionary.json', 'w') as f:
        json.dump(data, f, separators=(',', ':'))

#!/usr/bin/env python2
"""Generate BOM markdown for a MuzHack-style project."""
import argparse
import os.path
import logging
import yaml
from yamlordereddictloader import Loader as YamlLoader

logging.basicConfig(format='%(asctime)s %(message)s', level=logging.DEBUG)
_logger = logging.getLogger('generate-bom-markdown')

cl_parser = argparse.ArgumentParser(
    description='Generate BOM markdown from YAML')
cl_parser.add_argument('directory', help='Directory containing MuzHack files')
cl_parser.add_argument('-o', '--output', help='Output file path')
args = cl_parser.parse_args()


def _generate_bom_tables(component_type2components):
    """Generate Bill Of Materials tables from mapping of component type
    to components."""
    markdown = u''
    for component_type, components in component_type2components.items():
        headers = []
        for component in components:
            for header in component:
                if header not in headers:
                    headers.append(header)
        component_table = u"""|{}|
|{}|
""".format('|'.join(headers), '|'.join(['-' * len(x) for x in headers]))
        for i, field2value in enumerate(components):
            values = [field2value.get(x) for x in headers]
            values = [v if v is not None else '' for v in values]
            string_values = []
            for v in values:
                if isinstance(v, (list, tuple)):
                    string_values.append(', '.join(v))
                else:
                    if not isinstance(v, basestring):
                        string_values.append(str(v))
                    else:
                        string_values.append(v)
            component_table += u'|{}|\n'.format('|'.join(string_values))

        markdown += u"""### {}
{}
""".format(component_type, component_table)

    return markdown


def _read_bom():
    bom_path = os.path.join(args.directory, 'bom.yaml')
    with open(bom_path) as f_bom:
        bom_yaml = f_bom.read()
    bom_dict = yaml.load(bom_yaml, Loader=YamlLoader)

    _logger.warn('BOM YAML: {}'.format(bom_yaml))
    bom = ''
    if isinstance(list(bom_dict.values())[0], dict):
        _logger.debug('BOM tables should be divided into sections')
        for k, v in bom_dict.items():
            if not isinstance(v, dict):
                raise Exception(
                    'BOM entry {} should be a dict, for consistency')
            else:
                bom_tables = _generate_bom_tables(v)
                bom += """## {}
{}
""".format(k, bom_tables)
    else:
        _logger.debug('BOM tables should not be divided into sections')
        for k, v in bom_dict.items():
            if not isinstance(v, (list, tuple)):
                raise Exception(
                    'BOM entry {} should be a list, for consistency')

        bom += _generate_bom_tables(bom_dict)

    bom = bom.strip()
    return u'{}\n\n'.format(bom)

bom = _read_bom()

if bom[-1] != '\n':
    bom += '\n'
if args.output:
    with open(args.output, 'wt') as f_output:
        f_output.write(bom)
else:
    print(bom.encode('utf-8'))

import toml


def load_toml_string(toml_str):
    try:
        toml_dict = toml.loads(toml_str)
        return toml_dict
    except toml.TomlDecodeError as e:
        print(f"Error decoding TOML: {e}")
        return None

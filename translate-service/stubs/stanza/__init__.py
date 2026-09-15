"""Minimal stub so argostranslate.sbd can `import stanza` without Stanza/PyTorch.

AI Radar uses ARGOS_CHUNK_TYPE=MINISBD and never runs Stanza pipelines.
Real `stanza`/`torch` are uninstalled after pip to avoid pyenv builds missing `_lzma`.
"""


class Pipeline:
    def __init__(self, *args, **kwargs):
        raise RuntimeError(
            "Stanza is stubbed for AI Radar. Set ARGOS_CHUNK_TYPE=MINISBD "
            "(default) or install a Python with working lzma + argostranslate[stanza]."
        )

    def __call__(self, text):
        raise RuntimeError("Stanza Pipeline stub cannot tokenize")


DownloadMethod = None

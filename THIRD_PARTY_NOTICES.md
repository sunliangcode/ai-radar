# Third-party notices — translation stack

AI Radar uses **Argos Translate** for English → Simplified Chinese **news title** localization (`titleDisplay`). Summaries and other LLM features are separate and do not use these models.

This file documents dependencies, licenses, and download sources so redistribution stays clear and attributable.

## Direct dependency

| Component | Version / id | Source | License | Purpose |
|-----------|--------------|--------|---------|---------|
| **argostranslate** | `1.11.0` (pinned in [`translate-service/requirements.txt`](translate-service/requirements.txt)) | [PyPI](https://pypi.org/project/argostranslate/) / [GitHub](https://github.com/argosopentech/argos-translate) | **MIT** (upstream also states dual MIT / [CC0](https://creativecommons.org/publicdomain/zero/1.0/)) | Offline NMT library |
| **translate-en_zh** | Argos language package (installed via `argospm` / [`install_model.py`](translate-service/install_model.py)) | Official Argos package index (`https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json`); package blobs typically from Argos hosts (e.g. `argos-net.com`) | Distributed under the same **MIT / CC0** terms as the Argos package index | English → Simplified Chinese model (~100MB average per pair) |

**Copyright (software):** Copyright (c) 2020 Argos Open Technologies, LLC

Language models (`.argosmodel`) are **not** committed to this repository. They are downloaded at install or Docker build time from the official index. Do not rename or rebrand these models as original AI Radar works when redistributing.

### MIT License text (Argos Translate software)

```
MIT License

Copyright (c) 2020 Argos Open Technologies, LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Transitive runtime packages (via argostranslate)

These are pulled in by `pip install argostranslate==1.11.0`. Check each project for the authoritative license text when redistributing binaries:

| Package | Upstream | Typical license | Role |
|---------|----------|-----------------|------|
| [ctranslate2](https://github.com/OpenNMT/CTranslate2) | OpenNMT | MIT | Neural translation inference |
| [sentencepiece](https://github.com/google/sentencepiece) | Google | Apache-2.0 | Tokenization |
| [sacremoses](https://github.com/alvations/sacremoses) | | MIT | Moses-style tokenization helpers |
| [spacy](https://github.com/explosion/spaCy) | Explosion | MIT | NLP utilities / sentence boundary |
| [minisbd](https://pypi.org/project/minisbd/) | | (see package metadata) | Sentence boundary detection |
| [packaging](https://github.com/pypa/packaging) | PyPA | Apache-2.0 OR BSD-2-Clause | Version utilities |

Optional Stanza/PyTorch extras (`argostranslate[stanza]`) are **not** used by AI Radar. After `pip install`, [`install.sh`](install.sh) / Docker uninstall `stanza` and `torch`. The sidecar sets `ARGOS_CHUNK_TYPE=MINISBD` and loads a local [`translate-service/stubs/stanza`](translate-service/stubs/stanza) stub so PyPI argostranslate’s unconditional `import stanza` succeeds without `_lzma`/PyTorch (missing on some pyenv builds). Do not install real Stanza unless your interpreter has working `lzma`.

## How AI Radar uses them

1. [`translate-service/`](translate-service/) runs a small HTTP sidecar (`GET /health`, `POST /translate`).
2. The Java backend (`radar.translate.*` / `RADAR_TRANSLATE_URL`) calls that sidecar only for `titleDisplay` when `summaryLanguage=zh` and the title looks non-Chinese.
3. LLM prompts no longer request title translation.

## Redistribution checklist

- Keep this notice (or equivalent) with distributions that include the translate sidecar or ship Argos models.
- Preserve Argos / upstream copyright and license notices.
- If you redistribute `.argosmodel` files, retain their origin (Argos package index) and applicable MIT/CC0 terms.
- Do not claim Argos models or CTranslate2 as proprietary AI Radar IP.

## References

- Argos Translate: https://github.com/argosopentech/argos-translate  
- Package index: https://github.com/argosopentech/argospm-index  
- AI Radar install: [`docs/installation.md`](docs/installation.md) · [`translate-service/README.md`](translate-service/README.md)

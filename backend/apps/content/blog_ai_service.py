"""
AI-powered text-to-HTML conversion for blog posts using Gemini.

Takes plain text written by the doctor and converts it to clean,
semantic HTML suitable for the public blog.
"""

from __future__ import annotations

import logging
import re

from django.conf import settings

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE = """Eres la asistente editorial de la Dra. Estefania Ortigosa, pediatra en Pucon y Villarrica, Chile.
Ella escribe articulos educativos para padres y madres en su blog publico (estefipediatra.com).

Tu tarea: convertir el texto plano que escribio la doctora en HTML semantico limpio para su blog.

CONTEXTO DEL BLOG:
- Audiencia: padres y madres de bebes y ninos pequenos en Chile
- Tono: cercano, profesional, accesible — como habla una pediatra de confianza
- La doctora escribe en texto plano sin formato. Vos le das estructura HTML

REGLAS DE CONVERSION:
1. Parrafos separados por linea vacia → <p>...</p>
2. Lineas cortas sueltas seguidas de contenido mas largo → <h2>...</h2> (titulos de seccion)
3. Lineas que empiezan con "-", "*", "•" o describen items → <ul><li>...</li></ul>
4. Listas numeradas (1., 2., etc.) → <ol><li>...</li></ol>
5. Texto entre **asteriscos** → <strong>...</strong>
6. Frases que la doctora destaca con mayusculas o enfasis → <strong>...</strong>
7. Si detectas una frase de cierre personal (ej: "llamame", "para eso estoy") → envolvela en <p><em>...</em></p>

RESTRICCIONES:
- NO cambies el contenido ni reescribas frases — solo formatea
- NO agregues contenido nuevo, titulos inventados, ni introducciones
- NO uses atributos class, style, ni data-*
- NO uses <h1> (reservado para el titulo del post)
- Usa solo: <p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>
- Devuelve SOLO el HTML resultante, sin explicaciones, sin bloques de codigo, sin markdown

Texto de la doctora:
{content}"""


def convert_text_to_html(plain_text: str) -> str | None:
    """
    Convert plain text blog content to semantic HTML using Gemini.

    Returns the HTML string or None on failure.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        logger.warning("convert_text_to_html: GEMINI_API_KEY not set")
        return None

    if not plain_text.strip():
        return None

    prompt = PROMPT_TEMPLATE.format(content=plain_text)

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        response = model.generate_content(prompt)
        html = response.text.strip()

        # Strip markdown code fences if present
        html = re.sub(r"^```(?:html)?\s*", "", html)
        html = re.sub(r"\s*```$", "", html)

        if not html:
            logger.warning("convert_text_to_html: Gemini returned empty result")
            return None

        logger.info("convert_text_to_html: converted %d chars → %d chars HTML", len(plain_text), len(html))
        return html

    except Exception as exc:
        logger.error("convert_text_to_html: Gemini API error: %s", exc)
        return None

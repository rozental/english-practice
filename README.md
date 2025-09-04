# אתר תרגול אנגלית – ללא OpenAI

## איך עובדים
1. הורה → מסך "הורה": מדביק JSON או מעלה `sample.json`.
2. לוחץ "שמור ופתח לתרגול" → נשמר ב-localStorage.
3. ילדה → מסך "ילדה": מתרגלת, מקבלת פידבק, נספר נכון/טעויות.
4. הורה → "דוחות": רואה היסטוריה מהדפדפן ויכול לייצא JSON.

## פורמט JSON
{
"word_bank_order": ["word1","word2",...], // סדר קבוע לכל השאלות
"items": [
{
"id": "q1",
"hebrew_sentence": "משפט בעברית עם ____",
"english_sentence": "Sentence in English with ____",
"correct_option_index": 0 // אינדקס לתוך word_bank_order
},
... 10 פריטים בדיוק ...
]
}

example:
```{
  "word_bank_order": ["walk", "run"],
  "items": [
    {
      "id": "q1",
      "hebrew_sentence": "הוא ____ לבית הספר",
      "english_sentence": "He ____ to school",
      "correct_option_index": 0
    },
    {
      "id": "q2",
      "hebrew_sentence": "היא ____ מהר מאוד",
      "english_sentence": "She ____ very fast",
      "correct_option_index": 1
    }
  ],
  "translations_he": ["ללכת", "לרוץ"]
}
```

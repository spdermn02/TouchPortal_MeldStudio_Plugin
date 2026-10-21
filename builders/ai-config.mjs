import translate from "translate";

translate.engine = "google";

async function changeover(text,to) {
  const result = await translate(text, to);
  return result;
}

let text = await changeover("Toggle Streaming", "es");
console.log(text);
text = await changeover("Toggle Streaming", "fr");
console.log(text);
text = await changeover("Toggle Streaming", "pt");
console.log(text);
text = await changeover("Toggle Streaming", "tr");
console.log(text);
text = await changeover("Toggle Streaming", "fi");
console.log(text);
text = await changeover("Toggle Streaming", "nl");
console.log(text);
text = await changeover("Toggle Streaming", "de");
console.log(text);
text = await changeover("Toggle Streaming", "it");
console.log(text);
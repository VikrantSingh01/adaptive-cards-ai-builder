/**
 * Popup script — lightweight card generation
 */
const PATTERNS = {
  notification: { kw: ["notify","alert","message","deploy","build","announce"], build: d => ({
    type:"AdaptiveCard",version:"1.6",body:[{type:"TextBlock",text:d.split(/[.!?\n]/)[0].trim()||d,size:"medium",weight:"bolder",wrap:true,style:"heading"},{type:"TextBlock",text:d,wrap:true}]
  })},
  approval: { kw: ["approve","reject","request","expense","authorize"], build: d => ({
    type:"AdaptiveCard",version:"1.6",body:[{type:"TextBlock",text:d.split(/[.!?\n]/)[0].trim(),size:"large",weight:"bolder",wrap:true,style:"heading"},{type:"FactSet",facts:[{title:"Requester",value:"Name"},{title:"Amount",value:"$0"},{title:"Status",value:"Pending"}]}],actions:[{type:"Action.Execute",title:"Approve",style:"positive",verb:"approve"},{type:"Action.Execute",title:"Reject",style:"destructive",verb:"reject"}]
  })},
  form: { kw: ["form","input","survey","register","signup"], build: d => ({
    type:"AdaptiveCard",version:"1.6",body:[{type:"TextBlock",text:d.split(/[.!?\n]/)[0].trim(),size:"medium",weight:"bolder",wrap:true,style:"heading"},{type:"Input.Text",id:"name",label:"Name",placeholder:"Enter name..."},{type:"Input.Text",id:"details",label:"Details",isMultiline:true,placeholder:"Enter details..."}],actions:[{type:"Action.Execute",title:"Submit",style:"positive",verb:"submit"}]
  })},
  dashboard: { kw: ["dashboard","metrics","kpi","stats","analytics"], build: d => ({
    type:"AdaptiveCard",version:"1.6",body:[{type:"TextBlock",text:d.split(/[.!?\n]/)[0].trim(),size:"medium",weight:"bolder",wrap:true,style:"heading"},{type:"ColumnSet",columns:[{type:"Column",width:"stretch",items:[{type:"TextBlock",text:"Metric",isSubtle:true,wrap:true},{type:"TextBlock",text:"1,234",size:"extraLarge",weight:"bolder",color:"accent"}]},{type:"Column",width:"stretch",items:[{type:"TextBlock",text:"Metric",isSubtle:true,wrap:true},{type:"TextBlock",text:"89%",size:"extraLarge",weight:"bolder",color:"good"}]}]}]
  })}
};

function generate(desc, host, intent) {
  const lower = desc.toLowerCase();
  if (intent !== "auto" && PATTERNS[intent]) return PATTERNS[intent].build(desc);
  let best = null, bestScore = 0;
  for (const [n, p] of Object.entries(PATTERNS)) {
    let s = 0;
    for (const k of p.kw) if (lower.includes(k)) s += 10;
    if (s > bestScore) { bestScore = s; best = n; }
  }
  return (best ? PATTERNS[best] : PATTERNS.notification).build(desc);
}

document.getElementById("generate").addEventListener("click", () => {
  const desc = document.getElementById("input").value.trim();
  if (!desc) { showStatus("Enter a description", "error"); return; }
  const host = document.getElementById("host").value;
  const intent = document.getElementById("intent").value;
  const card = generate(desc, host, intent);
  document.getElementById("output").textContent = JSON.stringify(card, null, 2);
  showStatus("Generated!", "success");
});

document.getElementById("copy").addEventListener("click", () => {
  const text = document.getElementById("output").textContent;
  if (!text) { showStatus("Nothing to copy", "error"); return; }
  navigator.clipboard.writeText(text).then(() => showStatus("Copied!", "success"));
});

function showStatus(msg, type) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status show " + type;
  setTimeout(() => el.classList.remove("show"), 3000);
}

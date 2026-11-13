const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const parser=require('@babel/parser'),source=fs.readFileSync(path.join(__dirname,'../../Dashboard/src/components/whatsapp/InboxPage.jsx'),'utf8');
const ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});const functions={};
function visit(node){if(!node||typeof node!=='object')return;if(node.type==='FunctionDeclaration'&&node.id?.name==='hasUnconfirmed')functions.hasUnconfirmed=source.slice(node.start,node.end);if(node.type==='VariableDeclarator'&&['refreshActiveMessages','mergeMessages'].includes(node.id?.name))functions[node.id.name]=source.slice(node.init.start,node.init.end);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}
visit(ast);
function fixture(){const pending=[],map=new Map(),open={current:1};let messages=[],calls=0;
 const context=vm.createContext({W:'/api/whatsapp',msgRefreshRef:{current:map},openReqRef:open,adminApi:{get:()=>{calls++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));}},setMessages:update=>{messages=update(messages);},touchCache:()=>{}});
 context.mergeMessages=vm.runInContext('('+functions.mergeMessages+')',context);context.refresh=vm.runInContext('('+functions.refreshActiveMessages+')',context);
 return{context,pending,map,open,get messages(){return messages;},get calls(){return calls;}};
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
test('overlapping live events share the active request and queue one final refresh',async()=>{
 const f=fixture(),work=f.context.refresh(1);f.context.refresh(1);f.context.refresh(1);assert.equal(f.calls,1);
 f.pending.shift().resolve({data:{success:true,messages:[{id:1,status:'delivered'}]}});await settle();assert.equal(f.calls,2);
 f.pending.shift().resolve({data:{success:true,messages:[{id:1,status:'read'}]}});await work;assert.equal(f.calls,2);assert.equal(f.messages[0].status,'read');assert.equal(f.map.size,0);
});
test('a stale response never updates a different open conversation or starts a queued fetch',async()=>{
 const f=fixture(),work=f.context.refresh(1);f.context.refresh(1);f.open.current=2;
 f.pending.shift().resolve({data:{success:true,messages:[{id:1,status:'read'}]}});await work;assert.equal(f.calls,1);assert.equal(f.messages.length,0);
});
test('a failed refresh releases its request so a later live check can retry',async()=>{
 const f=fixture(),first=f.context.refresh(1);f.pending.shift().reject(Error('network'));await first;assert.equal(f.map.size,0);
 const second=f.context.refresh(1);f.pending.shift().resolve({data:{success:true,messages:[{id:1,status:'read'}]}});await second;assert.equal(f.calls,2);assert.equal(f.messages[0].status,'read');
});

test('late delivery/read receipts on old outgoing messages still refresh, while read/failed or inbound messages do not',()=>{
 const check=vm.runInNewContext('('+functions.hasUnconfirmed+')');
 for(const status of ['sent','sending','delivered'])assert.equal(check([{direction:'outbound',status,sent_at:'2020-01-01'}]),true);
 for(const status of ['read','failed'])assert.equal(check([{direction:'outbound',status}]),false);
 assert.equal(check([{direction:'inbound',status:'received'}]),false);
});

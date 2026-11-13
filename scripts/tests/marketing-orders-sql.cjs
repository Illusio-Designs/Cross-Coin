// Executes the actual report SQL against a small SQLite fixture. Requires
// python3 (stdlib sqlite3); CONVERT_TZ is registered for the report's IST day.
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('node:assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..'),db=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'marketing-orders-sql-')),'fixture.db');
const python=`import sqlite3,json,sys,datetime
p=json.load(sys.stdin)
c=sqlite3.connect(sys.argv[1]);c.row_factory=sqlite3.Row
def tz(value,a,b):
 return (datetime.datetime.fromisoformat(value.replace('Z','+00:00'))+datetime.timedelta(minutes=330)).strftime('%Y-%m-%d %H:%M:%S') if value else None
c.create_function('CONVERT_TZ',3,tz)
if p.get('setup'):
 c.executescript(p['setup']);c.commit();print('[]')
else:
 print(json.dumps([dict(r) for r in c.execute(p['sql'],p.get('params',{}))]))
`;
function execute(payload){const r=spawnSync('python3',['-c',python,db],{input:JSON.stringify(payload),encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return JSON.parse(r.stdout);}
execute({setup:`CREATE TABLE brands(id INTEGER,display_name TEXT,name TEXT);
CREATE TABLE orders(id INTEGER,order_number TEXT,brand_id INTEGER,created_at TEXT,status TEXT,payment_type TEXT,payment_status TEXT,final_amount REAL,utm_tracking_id INTEGER);
CREATE TABLE order_items(order_id INTEGER,quantity INTEGER);
CREATE TABLE returns(order_id INTEGER);
CREATE TABLE utm_tracking(id INTEGER,utm_source TEXT,utm_campaign TEXT);
CREATE TABLE ad_spend_daily(brand_id INTEGER,day TEXT,currency TEXT,spend REAL);
CREATE TABLE ad_spend_sync(brand_id INTEGER,last_synced_at TEXT);
INSERT INTO brands VALUES(1,NULL,'Cross Coin'),(2,NULL,'Soxbae');
INSERT INTO orders VALUES
(1,'CANCEL-1',1,'2026-11-11T19:00:00.000Z','cancelled','cod','cancelled',799,NULL),
(2,'RTO-1',1,'2026-11-12T10:00:00.000Z','rto delivered','cod','cancelled',799,NULL),
(3,'KEPT-1',1,'2026-11-12T12:00:00.000Z','delivered','razorpay','paid',499,NULL),
(4,'RETURN-1',1,'2026-11-12T13:00:00.000Z','returned_rto','razorpay','refunded',499,NULL),
(5,'PENDING-1',2,'2026-11-12T13:00:00.000Z','pending','cod','pending',300,NULL),
(6,'OUTSIDE-1',1,'2026-11-11T18:29:00.000Z','delivered','razorpay','paid',999,NULL),
(7,'OUTSIDE-2',1,'2026-11-12T18:30:00.000Z','delivered','razorpay','paid',999,NULL);
INSERT INTO order_items VALUES(1,2),(1,3),(2,7),(3,2),(4,1),(5,1),(6,999),(7,999);
INSERT INTO returns VALUES(4),(4);
INSERT INTO ad_spend_daily VALUES(1,'2026-11-12','INR',900),(2,'2026-11-12','INR',100);
INSERT INTO ad_spend_sync VALUES(1,'2026-11-12T14:00:00Z');`});
const database={sequelize:{query:async(sql,{replacements={}}={})=>execute({sql,params:replacements})}};
let sales;
function load(file){const module={exports:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,Date,Set,Map,console,require:name=>{
 if(name==='sequelize')return{QueryTypes:{SELECT:'SELECT'}};
 if(name.endsWith('config/db.js'))return database;
 if(name.endsWith('logging.js'))return{logger:{error:console.error}};
 if(name.endsWith('/common.js'))return{parseRange:()=>({start:new Date('2026-11-11T18:30:00.000Z'),end:new Date('2026-11-12T18:29:59.999Z')})};
 if(name.endsWith('/salesReportService.js'))return sales;
 if(name.endsWith('/metaAdsService.js'))return{ensureSchema:async()=>{}};
 throw Error(name);
 }},{filename:file});return module.exports;}
sales=load(path.join(root,'Backend/services/salesReportService.js'));
const report=load(path.join(root,'Backend/services/reports/marketingOrdersReport.js'));
async function read(query){let body,code=200;const res={json:v=>{body=v;},status:n=>{code=n;return res;}};await report.handler({query},res);assert.equal(code,200,JSON.stringify(body));return body;}
(async()=>{
 const all=await read({});assert.equal(all.summary.placedOrders,5);assert.equal(all.summary.units,16);assert.equal(all.summary.placedValue,2896);
 assert.equal(all.summary.cancelledOrders,1);assert.equal(all.summary.rtoOrders,1);assert.equal(all.summary.returnedOrders,1);assert.equal(all.summary.pendingOrders,1);assert.equal(all.summary.keptUnits,2);
 assert.equal(all.summary.spend,1000);assert.equal(all.summary.costPerOrder,200);assert.equal(all.summary.costPerUnit,62.5);assert.equal(all.summary.costPerKeptUnit,500);
 const scoped=await read({brandId:'1',stage:'cancelled'});assert.equal(scoped.summary.placedOrders,4);assert.equal(scoped.summary.units,15);assert.equal(scoped.summary.costPerUnit,60);assert.equal(scoped.filteredOrders,1);assert.equal(scoped.orders.length,1);assert.equal(scoped.orders[0].order_number,'CANCEL-1');assert.equal(scoped.orders[0].units,5);
 console.log('PASS actual report SQL: all statuses, multi-line orders, duplicate return rows, IST boundaries, store/status filters and cost denominators');
})().catch(error=>{console.error(error);process.exit(1)});

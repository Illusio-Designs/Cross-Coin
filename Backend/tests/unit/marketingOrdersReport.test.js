jest.mock('sequelize',()=>({QueryTypes:{SELECT:'SELECT'}}),{virtual:true});
jest.mock('../../config/db.js',()=>({sequelize:{query:jest.fn()}}));
jest.mock('../../config/logging.js',()=>({logger:{error:jest.fn()}}));
jest.mock('../../services/reports/common.js',()=>({parseRange:jest.fn(()=>({start:new Date('2026-11-11T18:30:00.000Z'),end:new Date('2026-11-12T18:29:59.999Z')}))}));
jest.mock('../../services/metaAdsService.js',()=>({ensureSchema:jest.fn()}));
const {buildReport,handler,csvCell}=require('../../services/reports/marketingOrdersReport.js');
const {sequelize}=require('../../config/db.js');
const {parseRange}=require('../../services/reports/common.js');
const brands=[{id:1,name:'Cross Coin'},{id:2,name:'Soxbae'}];
const orders=[
 {brand_id:1,day:'2026-11-12',stage:'cancelled',orders:2,units:7,value:1000},
 {brand_id:1,day:'2026-11-12',stage:'rto',orders:1,units:2,value:500},
 {brand_id:1,day:'2026-11-12',stage:'delivered',orders:3,units:6,value:1500},
 {brand_id:1,day:'2026-11-12',stage:'returned',orders:1,units:1,value:500},
 {brand_id:1,day:'2026-11-12',stage:'in_transit',orders:1,units:4,value:500},
];
const spend=[{brand_id:1,day:'2026-11-12',currency:'INR',spend:800,spend_rows:1}];
const response=()=>{const r={status:jest.fn(),json:jest.fn(),setHeader:jest.fn(),write:jest.fn(()=>true),end:jest.fn()};r.status.mockReturnValue(r);return r;};
beforeEach(()=>{
 jest.clearAllMocks();sequelize.query.mockImplementation(async sql=>{
  if(sql.includes('FROM brands'))return brands;
  if(sql.includes('AS spend_rows'))return spend;
  if(sql.includes('AS lastSyncedAt'))return [{lastSyncedAt:'2026-11-12T10:00:00Z'}];
  if(sql.includes('COUNT(*) AS orders'))return orders;
  return [];
 });
});
test('all placed orders and sold units include cancelled and RTO, while kept units exclude both and customer returns',()=>{
 const {summary}=buildReport(orders,spend,brands);
 expect(summary).toMatchObject({placedOrders:8,units:20,cancelledOrders:2,rtoOrders:1,returnedOrders:1,pendingOrders:1,keptOrders:3,keptUnits:6,spend:800,costPerOrder:100,costPerUnit:40,costPerKeptUnit:133.33,costPerKeptOrder:266.67,cancelledUnits:7,rtoUnits:2,returnedUnits:1});
});
test('spend with no orders still raises the overall acquisition cost',()=>{
 const {summary,daily}=buildReport(orders,[...spend,{brand_id:1,day:'2026-11-11',currency:'INR',spend:500,spend_rows:1}],brands);
 expect(summary).toMatchObject({spend:1300,costPerOrder:162.5,costPerUnit:65});expect(daily).toHaveLength(2);expect(daily[1].costPerOrder).toBeNull();
});
test('missing store spend does not lower overall costs by silently counting it as free',()=>{
 const report=buildReport([...orders,{brand_id:2,day:'2026-11-12',stage:'delivered',orders:2,units:2}],spend,brands);
 expect(report.missingBrands).toEqual(['Soxbae']);expect(report.summary).toMatchObject({spend:null,importedSpend:800,costPerOrder:null,costPerUnit:null});expect(report.brands[0].costPerOrder).toBe(100);
});
test('currencies are never added into a false INR cost',()=>{
 const {summary}=buildReport(orders,[...spend,{brand_id:1,day:'2026-11-12',currency:'USD',spend:20,spend_rows:1}],brands);
 expect(summary).toMatchObject({spend:null,importedSpend:null,costPerOrder:null});expect(summary.currencies).toEqual(['INR','USD']);
});
test('zero kept units and unimported spend show unavailable instead of a zero cost',()=>{
 expect(buildReport(orders.filter(r=>r.stage!=='delivered'),spend,brands).summary.costPerKeptUnit).toBeNull();
 expect(buildReport(orders,[],brands).summary.costPerOrder).toBeNull();expect(buildReport([],[],brands).summary.placedOrders).toBe(0);
 expect(buildReport(orders,[{...spend[0],spend:0}],brands).summary.costPerOrder).toBe(0);
});
test('status filtering is confined to the order list; summary still contains every placed order',async()=>{
 const r=response();await handler({query:{stage:'rto',brandId:'1'}},r);
 expect(r.json).toHaveBeenCalledWith(expect.objectContaining({summary:expect.objectContaining({placedOrders:8}),filteredOrders:1}));
 const calls=sequelize.query.mock.calls;const aggregate=calls.find(([sql])=>sql.includes('COUNT(*) AS orders'));const list=calls.find(([sql])=>sql.includes('o.order_number'));
 expect(aggregate[0]).not.toContain(') = :stage');expect(list[0]).toContain(') = :stage');expect(list[1].replacements).toMatchObject({stage:'rto',brandId:1,startDay:'2026-11-12',endDay:'2026-11-12'});
});
test('a scoped admin cannot read another brand',async()=>{
 const r=response();await handler({brandId:2,query:{brandId:'1'}},r);expect(r.status).toHaveBeenCalledWith(403);expect(sequelize.query).not.toHaveBeenCalled();
});
test('implicit store scope is enforced on orders, spend and account-sync queries',async()=>{
 const r=response();await handler({brand:{id:2},query:{}},r);for(const [sql,opts]of sequelize.query.mock.calls){expect(opts.replacements.brandId).toBe(2);expect(sql).toContain(':brandId');}
});
test.each([{brandId:'bad'},{brandId:'0'},{stage:'not-a-stage'},{startDate:'2026-02-30'},{endDate:'bad-date'}])('invalid report scope %p is rejected',async query=>{
 const r=response();await handler({query},r);expect(r.status).toHaveBeenCalledWith(400);expect(sequelize.query).not.toHaveBeenCalled();
});
test('invalid dates are rejected',async()=>{
 parseRange.mockReturnValueOnce({start:new Date('invalid'),end:new Date()});const r=response();await handler({query:{}},r);expect(r.status).toHaveBeenCalledWith(400);
});
test('CSV exports every matching page using a stable keyset, without the screen page limit',async()=>{
 const batch=Array.from({length:1000},(_,i)=>({id:2000-i,order_number:`ORD-${2000-i}`,brand_id:1,created_at:'2026-11-12T12:00:00.000Z',status:i===0?'cancelled':'rto',units:1}));let reads=0;
 sequelize.query.mockImplementation(async sql=>sql.includes('FROM brands')?brands:(++reads===1?batch:[{...batch[0],id:1000,order_number:'LAST'}]));
 const r=response();await handler({query:{format:'csv',page:'4'}},r);expect(r.end).toHaveBeenCalledTimes(1);expect(r.write).toHaveBeenCalledTimes(1002);
 const last=sequelize.query.mock.calls.at(-1);expect(last[0]).toContain(':cursorId');expect(last[0]).not.toContain('OFFSET');expect(last[1].replacements).toMatchObject({cursorId:1001,limit:1000});expect(r.write.mock.calls.at(-1)[0]).toContain('LAST');
});
test('CSV escapes quotes, newlines and spreadsheet formulas',()=>{
 expect(csvCell('a"b\nc')).toBe('"a""b\nc"');expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');
});

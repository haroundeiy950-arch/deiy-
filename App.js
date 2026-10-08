import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const C = { green: '#1F5A3C', deep: '#123B27', sun: '#F2B632', bg: '#F6F4EC', ink: '#1B2320', mute: '#6B746F', line: '#E4E0D3', red: '#B3382C', mint: '#E3F0E8', amber: '#FFF3D6' };
const SAFE = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 50;
const CATS = ['All', 'Vegetables', 'Fruit', 'Grains', 'Meat'];
const NEXT = { placed: 'accepted', accepted: 'ready', ready: 'done' };
const MOCK_OTP = '1234';
const ROLE_LABEL = { buyer: 'Buyer', vendor: 'Vendor', officer: 'Market field officer' };

const MARKETS = [
  { id: 'm1', name: 'Musanze Main Market', area: 'Central Musanze', days: 'Open daily' },
  { id: 'm2', name: 'Kinigi Market', area: 'Kinigi Sector', days: 'Tuesday and Friday' },
  { id: 'm3', name: 'Ruhengeri Market', area: 'Ruhengeri', days: 'Open daily' },
];
const CHECKS = [
  ['water', 'Clean water available'],
  ['bins', 'Waste bins in use'],
  ['storage', 'Food stored off the ground'],
  ['expired', 'Expired or spoiled goods found'],
];
const isGood = (k, v) => (k === 'expired' ? v === false : v === true);
const issuesOf = (i) => CHECKS.filter(([k]) => !isGood(k, i.checks[k])).length;
const resultOf = (i) => (i.hygiene >= 3 && issuesOf(i) === 0 ? 'Pass' : 'Action needed');

const seedVendors = [
  { id: 'v1', name: 'Mukamana Fresh Stall', verified: true, pending: false, products: [
    { id: 'p1', name: 'Irish potatoes (kg)', price: 500, stock: 80, cat: 'Vegetables' },
    { id: 'p2', name: 'Tomatoes (kg)', price: 800, stock: 40, cat: 'Vegetables' } ] },
  { id: 'v2', name: 'Kinigi Farmers Corner', verified: true, pending: false, products: [
    { id: 'p3', name: 'Beans (kg)', price: 1100, stock: 60, cat: 'Grains' },
    { id: 'p4', name: 'Avocado (piece)', price: 300, stock: 50, cat: 'Fruit' } ] },
  { id: 'v3', name: 'Ruhengeri Butcher', verified: false, pending: true, products: [
    { id: 'p5', name: 'Beef (kg)', price: 4500, stock: 15, cat: 'Meat' } ] },
];

const rwf = (n) => n.toLocaleString() + ' RWF';

function Btn({ label, onPress, kind = 'main', style, small }) {
  const map = {
    main: [C.green, '#fff', C.green], sun: [C.sun, C.ink, C.sun], danger: [C.red, '#fff', C.red],
    light: ['#fff', C.green, '#fff'], ghost: ['transparent', C.green, C.green], ghostLight: ['transparent', '#fff', '#ffffff99'],
  };
  const [bg, fg, bd] = map[kind];
  const filled = bg !== 'transparent';
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}
      style={[s.btn, small && { paddingVertical: 9, paddingHorizontal: 16 }, { backgroundColor: bg, borderColor: bd }, filled && s.lift, style]}>
      <Text style={[s.btnT, small && { fontSize: 14 }, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const Pill = ({ text, bg, fg }) => <Text style={[s.pill, { backgroundColor: bg, color: fg }]}>{text}</Text>;
const Badge = ({ ok, pending }) =>
  ok ? <Pill text="Verified" bg={C.green} fg="#fff" /> : pending ? <Pill text="Verification pending" bg={C.sun} fg={C.ink} /> : <Pill text="Not verified" bg={C.line} fg={C.ink} />;
const Field = (p) => <TextInput placeholderTextColor={C.mute} {...p} style={[s.input, p.style]} />;
const Tabs = ({ items, tab, setTab }) => (
  <View style={s.tabs}>
    {items.map(([k, l]) => (
      <TouchableOpacity key={k} style={[s.tab, tab === k && s.tabOn]} onPress={() => setTab(k)}>
        <Text style={[s.tabT, tab === k && { color: '#fff', fontWeight: '700' }]}>{l}</Text>
      </TouchableOpacity>
    ))}
  </View>
);
const Top = ({ role, logout }) => (
  <View style={s.top}>
    <View>
      <Text style={s.brand}>Musanze Safe Market</Text>
      <Text style={s.brandSub}>{ROLE_LABEL[role]}</Text>
    </View>
    <TouchableOpacity onPress={logout} style={s.out}><Text style={{ color: '#fff', fontWeight: '600' }}>Log out</Text></TouchableOpacity>
  </View>
);

export default function App() {
  const [role, setRole] = useState(null);
  const [session, setSession] = useState(null);
  const [vendors, setVendors] = useState(seedVendors);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [cart, setCart] = useState([]);
  const [inspections, setInspections] = useState([]);

  const data = { vendors, setVendors, orders, setOrders, reviews, setReviews, cart, setCart, session, inspections, setInspections };
  const logout = () => { setRole(null); setSession(null); setCart([]); };

  let body;
  if (!role) body = <Welcome setRole={setRole} />;
  else if (!session) body = <Login role={role} back={() => setRole(null)} onDone={(phone) => {
    if (role === 'vendor') {
      const id = 'v' + Date.now();
      setVendors((v) => [...v, { id, name: 'Stall ' + phone.slice(-4), verified: false, pending: false, products: [] }]);
      setSession({ phone, vendorId: id });
    } else setSession({ phone });
  }} />;
  else body = role === 'buyer' ? <Buyer d={data} /> : role === 'vendor' ? <Vendor d={data} /> : <Officer d={data} />;

  return (
    <View style={s.root}>
      <StatusBar barStyle={session ? 'light-content' : role ? 'dark-content' : 'light-content'} />
      {session && <Top role={role} logout={logout} />}
      {body}
    </View>
  );
}

function Welcome({ setRole }) {
  return (
    <View style={s.welcome}>
      <View style={s.ring1} /><View style={s.ring2} />
      <Text style={s.kicker}>Musanze Safe Market</Text>
      <Text style={s.hero}>Buy fresh.{'\n'}Buy from vendors you can trust.</Text>
      <Text style={s.heroSub}>Verified stalls, tracked orders, and market inspections you can see.</Text>
      <Btn label="I want to buy" kind="light" onPress={() => setRole('buyer')} style={{ marginTop: 30 }} />
      <Btn label="I sell at the market" kind="sun" onPress={() => setRole('vendor')} style={{ marginTop: 12 }} />
      <Btn label="I inspect markets" kind="ghostLight" onPress={() => setRole('officer')} style={{ marginTop: 12 }} />
    </View>
  );
}

function Login({ role, back, onDone }) {
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const send = () => {
    if (!/^07\d{8}$/.test(phone)) return setErr('Enter a Rwandan number like 0788123456.');
    setErr(''); setSent(true);
  };
  const verify = () => (otp === MOCK_OTP ? onDone(phone) : setErr('Wrong code. Demo code is ' + MOCK_OTP + '.'));
  const title = role === 'buyer' ? 'Sign in to buy' : role === 'vendor' ? 'Sign in to sell' : 'Sign in to inspect';
  return (
    <View style={[s.center, { paddingTop: SAFE + 24 }]}>
      <Text style={s.h1}>{title}</Text>
      <Text style={[s.mute, { marginBottom: 16 }]}>We send a one-time code to your phone.</Text>
      <Field placeholder="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={!sent} />
      {sent && <Field placeholder="4-digit code" keyboardType="number-pad" value={otp} onChangeText={setOtp} maxLength={4} />}
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn label={sent ? 'Verify code' : 'Send code'} onPress={sent ? verify : send} />
      <Btn label="Back" kind="ghost" onPress={back} style={{ marginTop: 10 }} />
    </View>
  );
}

function Buyer({ d }) {
  const [tab, setTab] = useState('home');
  const [vid, setVid] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [pay, setPay] = useState('momo');
  const cartCount = d.cart.reduce((a, c) => a + c.qty, 0);
  const total = d.cart.reduce((a, c) => a + c.qty * c.price, 0);

  const add = (p, v) => d.setCart((c) => {
    const f = c.find((x) => x.id === p.id);
    return f ? c.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x)) : [...c, { ...p, qty: 1, vendorId: v.id, vendorName: v.name }];
  });
  const rating = (v) => {
    const r = d.reviews.filter((x) => x.vendorId === v.id && !x.report);
    return r.length ? (r.reduce((a, x) => a + x.rating, 0) / r.length).toFixed(1) + ' / 5' : 'No ratings yet';
  };
  const lastInspection = (v) => d.inspections.find((i) => i.vendorId === v.id);
  const place = () => {
    const groups = {};
    d.cart.forEach((c) => (groups[c.vendorId] = [...(groups[c.vendorId] || []), c]));
    const made = Object.entries(groups).map(([vendorId, items]) => ({
      id: 'o' + Date.now() + vendorId, vendorId, vendorName: items[0].vendorName, items, pay, status: 'placed',
      total: items.reduce((a, c) => a + c.qty * c.price, 0), buyer: d.session.phone,
    }));
    d.setOrders((o) => [...made, ...o]); d.setCart([]); setTab('orders');
  };

  const vendor = d.vendors.find((v) => v.id === vid);
  const insp = vendor && lastInspection(vendor);
  return (
    <View style={{ flex: 1 }}>
      <Tabs tab={tab} setTab={(t) => { setTab(t); setVid(null); }} items={[['home', 'Market'], ['cart', 'Cart (' + cartCount + ')'], ['orders', 'My orders']]} />
      <ScrollView contentContainerStyle={s.pad}>
        {tab === 'home' && !vendor && (
          <>
            <Field placeholder="Search products or stalls" value={q} onChangeText={setQ} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setCat(c)} style={[s.chip, cat === c && { backgroundColor: C.green }]}>
                  <Text style={{ color: cat === c ? '#fff' : C.ink, fontWeight: '600' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {d.vendors
              .filter((v) => v.products.some((p) => (cat === 'All' || p.cat === cat) && (p.name + v.name).toLowerCase().includes(q.toLowerCase())))
              .map((v) => (
                <TouchableOpacity key={v.id} style={s.card} onPress={() => setVid(v.id)}>
                  <Text style={s.h2}>{v.name}</Text>
                  <Badge ok={v.verified} pending={v.pending} />
                  <Text style={s.mute}>{rating(v)} · {v.products.length} products</Text>
                </TouchableOpacity>
              ))}
          </>
        )}
        {tab === 'home' && vendor && (
          <>
            <Btn label="Back to market" kind="ghost" small onPress={() => setVid(null)} style={{ alignSelf: 'flex-start' }} />
            <Text style={[s.h1, { marginTop: 14 }]}>{vendor.name}</Text>
            <Badge ok={vendor.verified} pending={vendor.pending} />
            <Text style={[s.mute, { marginVertical: 6 }]}>{rating(vendor)}</Text>
            {insp && (
              <View style={[s.note, { backgroundColor: resultOf(insp) === 'Pass' ? C.mint : C.amber }]}>
                <Text style={s.h2}>Last inspection: {resultOf(insp)}</Text>
                <Text style={s.mute}>{insp.date} · hygiene {insp.hygiene} / 5</Text>
              </View>
            )}
            {!vendor.verified && <Text style={s.warn}>This stall is not verified yet. Prefer pay on pickup.</Text>}
            {vendor.products.map((p) => (
              <View key={p.id} style={[s.card, s.row]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.h2}>{p.name}</Text>
                  <Text style={s.mute}>{rwf(p.price)} · {p.stock} in stock</Text>
                </View>
                <Btn label="Add" kind="sun" small onPress={() => add(p, vendor)} />
              </View>
            ))}
          </>
        )}
        {tab === 'cart' && (
          d.cart.length === 0 ? <Text style={s.mute}>Your cart is empty. Open the market and add something fresh.</Text> : (
            <>
              {d.cart.map((c) => (
                <View key={c.id} style={[s.card, s.row]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{c.name} × {c.qty}</Text>
                    <Text style={s.mute}>{c.vendorName}</Text>
                  </View>
                  <Text style={s.h2}>{rwf(c.qty * c.price)}</Text>
                </View>
              ))}
              <Text style={[s.h1, { marginVertical: 10 }]}>Total: {rwf(total)}</Text>
              <View style={s.row}>
                {[['momo', 'Pay with MoMo'], ['pickup', 'Pay on pickup']].map(([k, l]) => (
                  <TouchableOpacity key={k} onPress={() => setPay(k)} style={[s.chip, { flex: 1, alignItems: 'center' }, pay === k && { backgroundColor: C.green }]}>
                    <Text style={{ color: pay === k ? '#fff' : C.ink, fontWeight: '600' }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Btn label="Place order" onPress={place} style={{ marginTop: 14 }} />
            </>
          )
        )}
        {tab === 'orders' && (
          d.orders.filter((o) => o.buyer === d.session.phone).length === 0
            ? <Text style={s.mute}>No orders yet.</Text>
            : d.orders.filter((o) => o.buyer === d.session.phone).map((o) => <BuyerOrder key={o.id} o={o} d={d} />)
        )}
      </ScrollView>
    </View>
  );
}

function BuyerOrder({ o, d }) {
  const done = d.reviews.find((r) => r.orderId === o.id);
  const steps = ['placed', 'accepted', 'ready', 'done'];
  const [comment, setComment] = useState('');
  const send = (rating, report) => d.setReviews((r) => [...r, { orderId: o.id, vendorId: o.vendorId, rating, comment, report }]);
  return (
    <View style={s.card}>
      <Text style={s.h2}>{o.vendorName}</Text>
      <Text style={s.mute}>{o.items.map((i) => i.name + ' × ' + i.qty).join(', ')}</Text>
      <Text style={s.mute}>{rwf(o.total)} · {o.pay === 'momo' ? 'MoMo' : 'Pay on pickup'}</Text>
      <View style={[s.row, { marginVertical: 10 }]}>
        {steps.map((st) => (
          <View key={st} style={{ flex: 1, alignItems: 'center' }}>
            <View style={[s.dot, steps.indexOf(st) <= steps.indexOf(o.status) && { backgroundColor: C.green }]} />
            <Text style={{ fontSize: 11, color: C.mute }}>{st}</Text>
          </View>
        ))}
      </View>
      {o.status === 'done' && !done && (
        <>
          <Field placeholder="Comment (optional)" value={comment} onChangeText={setComment} />
          <View style={s.row}>
            {[1, 2, 3, 4, 5].map((n) => <Btn key={n} label={String(n)} kind="sun" small onPress={() => send(n, false)} style={{ flex: 1, marginRight: 4, paddingHorizontal: 0 }} />)}
          </View>
          <Btn label="Report a safety issue" kind="danger" onPress={() => send(1, true)} style={{ marginTop: 8 }} />
        </>
      )}
      {done && <Text style={s.mute}>{done.report ? 'Report sent. Thank you.' : 'Thanks for rating: ' + done.rating + ' / 5'}</Text>}
    </View>
  );
}

function Vendor({ d }) {
  const [tab, setTab] = useState('orders');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [cat, setCat] = useState('Vegetables');
  const [err, setErr] = useState('');
  const me = d.vendors.find((v) => v.id === d.session.vendorId);
  const upd = (patch) => d.setVendors((vs) => vs.map((v) => (v.id === me.id ? { ...v, ...patch } : v)));
  const myOrders = d.orders.filter((o) => o.vendorId === me.id);
  const myReviews = d.reviews.filter((r) => r.vendorId === me.id);

  const addProduct = () => {
    if (!name.trim() || !+price || !+stock) return setErr('Enter a name, a price and the stock as numbers.');
    setErr('');
    upd({ products: [...me.products, { id: 'p' + Date.now(), name: name.trim(), price: +price, stock: +stock, cat }] });
    setName(''); setPrice(''); setStock('');
  };
  const advance = (o) => d.setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, status: NEXT[x.status] } : x)));

  return (
    <View style={{ flex: 1 }}>
      <Tabs tab={tab} setTab={setTab} items={[['orders', 'Orders'], ['products', 'Products'], ['verify', 'Verify'], ['ratings', 'Ratings']]} />
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={s.h1}>{me.name}</Text>
        <Badge ok={me.verified} pending={me.pending} />
        <View style={{ height: 12 }} />
        {tab === 'orders' && (myOrders.length === 0 ? <Text style={s.mute}>No orders yet. Buyers will see your stall once it has products.</Text> :
          myOrders.map((o) => (
            <View key={o.id} style={s.card}>
              <Text style={s.h2}>{o.items.map((i) => i.name + ' × ' + i.qty).join(', ')}</Text>
              <Text style={s.mute}>{rwf(o.total)} · {o.pay === 'momo' ? 'MoMo' : 'Pay on pickup'} · {o.status}</Text>
              {NEXT[o.status] && <Btn label={'Mark as ' + NEXT[o.status]} onPress={() => advance(o)} style={{ marginTop: 8 }} />}
            </View>
          )))}
        {tab === 'products' && (
          <>
            <View style={s.card}>
              <Field placeholder="Product name" value={name} onChangeText={setName} />
              <View style={s.row}>
                <Field placeholder="Price (RWF)" keyboardType="number-pad" value={price} onChangeText={setPrice} style={{ flex: 1, marginRight: 8 }} />
                <Field placeholder="Stock" keyboardType="number-pad" value={stock} onChangeText={setStock} style={{ flex: 1 }} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATS.slice(1).map((c) => (
                  <TouchableOpacity key={c} onPress={() => setCat(c)} style={[s.chip, cat === c && { backgroundColor: C.green }]}>
                    <Text style={{ color: cat === c ? '#fff' : C.ink, fontWeight: '600' }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {!!err && <Text style={s.err}>{err}</Text>}
              <Btn label="Add product" onPress={addProduct} style={{ marginTop: 6 }} />
            </View>
            {me.products.map((p) => (
              <View key={p.id} style={s.card}>
                <Text style={s.h2}>{p.name}</Text>
                <Text style={s.mute}>{rwf(p.price)} · {p.stock} in stock · {p.cat}</Text>
              </View>
            ))}
          </>
        )}
        {tab === 'verify' && (
          <View style={s.card}>
            <Text style={s.h2}>Get the verified badge</Text>
            <Text style={[s.mute, { marginVertical: 6 }]}>Submit your national ID and market permit. Buyers trust verified stalls more.</Text>
            {me.verified ? <Text style={{ color: C.green, fontWeight: '700' }}>You are verified.</Text> :
              me.pending ? (
                <>
                  <Text style={s.mute}>Your documents are with the market office.</Text>
                  <Btn label="Demo: approve as admin" kind="sun" onPress={() => upd({ verified: true, pending: false })} style={{ marginTop: 10 }} />
                </>
              ) : <Btn label="Submit documents" onPress={() => upd({ pending: true })} />}
          </View>
        )}
        {tab === 'ratings' && (myReviews.length === 0 ? <Text style={s.mute}>No feedback yet.</Text> :
          myReviews.map((r, i) => (
            <View key={i} style={s.card}>
              <Text style={[s.h2, r.report && { color: C.red }]}>{r.report ? 'Safety report' : r.rating + ' / 5'}</Text>
              <Text style={s.mute}>{r.comment || 'No comment'}</Text>
            </View>
          )))}
      </ScrollView>
    </View>
  );
}

function Officer({ d }) {
  const [screen, setScreen] = useState('home');
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState([]);
  const [detail, setDetail] = useState(null);
  const [photoErr, setPhotoErr] = useState('');

  const marketOf = (id) => MARKETS.find((m) => m.id === id);
  const vendorOf = (id) => d.vendors.find((v) => v.id === id);
  const set = (patch) => setDraft((x) => ({ ...x, ...patch }));

  const start = (m) => {
    setDraft({ marketId: m.id, vendorId: null, hygiene: 0, checks: {}, notes: '', images: [] });
    setErrors([]); setPhotoErr(''); setScreen('form');
  };
  const validate = () => {
    const e = [];
    if (!draft.vendorId) e.push('Choose the stall you inspected.');
    if (!draft.hygiene) e.push('Give a hygiene score from 1 to 5.');
    CHECKS.forEach(([k, l]) => { if (draft.checks[k] === undefined) e.push('Answer: ' + l); });
    if (draft.notes.trim().length < 10) e.push('Write at least 10 characters of notes.');
    setErrors(e);
    if (!e.length) setScreen('photos');
  };
  const pick = async (cam) => {
    const perm = cam ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setPhotoErr('Allow access in your phone settings to add photos.');
    const res = cam
      ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if (!res.canceled) { setPhotoErr(''); set({ images: [...draft.images, res.assets[0].uri] }); }
  };
  const toReview = () => (draft.images.length ? setScreen('review') : setPhotoErr('Add at least one photo as evidence.'));
  const save = () => {
    const rec = { ...draft, id: 'i' + Date.now(), date: new Date().toLocaleString(), officer: d.session.phone };
    d.setInspections((l) => [rec, ...l]);
    setDraft(null); setScreen('records');
  };

  const Steps = ({ at }) => (
    <View style={[s.row, { marginBottom: 16 }]}>
      {['Form', 'Photos', 'Review'].map((l, i) => (
        <View key={l} style={{ flex: 1, alignItems: 'center' }}>
          <View style={[s.step, i <= at && { backgroundColor: C.green }]}><Text style={{ color: i <= at ? '#fff' : C.mute, fontWeight: '700' }}>{i + 1}</Text></View>
          <Text style={{ fontSize: 12, color: i <= at ? C.green : C.mute, marginTop: 3 }}>{l}</Text>
        </View>
      ))}
    </View>
  );
  const Result = ({ i }) => <Pill text={resultOf(i)} bg={resultOf(i) === 'Pass' ? C.green : C.sun} fg={resultOf(i) === 'Pass' ? '#fff' : C.ink} />;

  if (screen === 'form' && draft) {
    const m = marketOf(draft.marketId);
    return (
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        <Btn label="Cancel" kind="ghost" small onPress={() => setScreen('home')} style={{ alignSelf: 'flex-start' }} />
        <Text style={[s.h1, { marginTop: 12 }]}>New inspection</Text>
        <Text style={[s.mute, { marginBottom: 14 }]}>{m.name}</Text>
        <Steps at={0} />
        <Text style={s.label}>Stall inspected</Text>
        {d.vendors.map((v) => (
          <TouchableOpacity key={v.id} onPress={() => set({ vendorId: v.id })} style={[s.opt, draft.vendorId === v.id && s.optOn]}>
            <Text style={{ color: draft.vendorId === v.id ? '#fff' : C.ink, fontWeight: '600' }}>{v.name}</Text>
          </TouchableOpacity>
        ))}
        <Text style={s.label}>Hygiene score</Text>
        <View style={[s.row, { marginBottom: 6 }]}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => set({ hygiene: n })} style={[s.score, draft.hygiene === n && s.optOn]}>
              <Text style={{ color: draft.hygiene === n ? '#fff' : C.ink, fontWeight: '700', fontSize: 16 }}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.label}>Checklist</Text>
        {CHECKS.map(([k, l]) => (
          <View key={k} style={[s.card, { paddingVertical: 10 }]}>
            <Text style={[s.h2, { marginBottom: 8 }]}>{l}</Text>
            <View style={s.row}>
              {[[true, 'Yes'], [false, 'No']].map(([v, t]) => (
                <TouchableOpacity key={t} onPress={() => set({ checks: { ...draft.checks, [k]: v } })}
                  style={[s.chip, { flex: 1, alignItems: 'center', marginBottom: 0 }, draft.checks[k] === v && { backgroundColor: C.green }]}>
                  <Text style={{ color: draft.checks[k] === v ? '#fff' : C.ink, fontWeight: '600' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <Text style={s.label}>Notes</Text>
        <Field placeholder="What did you see? Actions agreed with the vendor." multiline value={draft.notes} onChangeText={(t) => set({ notes: t })} style={{ minHeight: 90, textAlignVertical: 'top' }} />
        {errors.length > 0 && (
          <View style={s.errBox}>
            <Text style={[s.h2, { color: C.red, marginBottom: 4 }]}>Fix these to continue</Text>
            {errors.map((e) => <Text key={e} style={{ color: C.red, marginTop: 2 }}>• {e}</Text>)}
          </View>
        )}
        <Btn label="Continue to photos" onPress={validate} />
      </ScrollView>
    );
  }

  if (screen === 'photos' && draft) {
    return (
      <ScrollView contentContainerStyle={s.pad}>
        <Btn label="Back to form" kind="ghost" small onPress={() => setScreen('form')} style={{ alignSelf: 'flex-start' }} />
        <Text style={[s.h1, { marginTop: 12, marginBottom: 14 }]}>Add photos</Text>
        <Steps at={1} />
        <View style={s.row}>
          <Btn label="Take photo" onPress={() => pick(true)} style={{ flex: 1, marginRight: 8 }} />
          <Btn label="From gallery" kind="sun" onPress={() => pick(false)} style={{ flex: 1 }} />
        </View>
        {!!photoErr && <Text style={[s.err, { marginTop: 10 }]}>{photoErr}</Text>}
        <View style={s.grid}>
          {draft.images.map((u, i) => (
            <View key={u} style={s.thumbWrap}>
              <Image source={{ uri: u }} style={s.thumb} />
              <TouchableOpacity style={s.x} onPress={() => set({ images: draft.images.filter((_, j) => j !== i) })}><Text style={{ color: '#fff', fontWeight: '700' }}>Remove</Text></TouchableOpacity>
            </View>
          ))}
        </View>
        {draft.images.length === 0 && <Text style={[s.mute, { marginTop: 14 }]}>No photos yet. Take a photo of the stall or pick one from your gallery.</Text>}
        <Btn label="Review inspection" onPress={toReview} style={{ marginTop: 18 }} />
      </ScrollView>
    );
  }

  if (screen === 'review' && draft) {
    return (
      <ScrollView contentContainerStyle={s.pad}>
        <Btn label="Back to photos" kind="ghost" small onPress={() => setScreen('photos')} style={{ alignSelf: 'flex-start' }} />
        <Text style={[s.h1, { marginTop: 12, marginBottom: 14 }]}>Review</Text>
        <Steps at={2} />
        <InspectionView i={draft} marketOf={marketOf} vendorOf={vendorOf} Result={Result} />
        <Btn label="Save inspection" onPress={save} style={{ marginTop: 8 }} />
        <Btn label="Edit form" kind="ghost" onPress={() => setScreen('form')} style={{ marginTop: 10 }} />
      </ScrollView>
    );
  }

  if (screen === 'details' && detail) {
    return (
      <ScrollView contentContainerStyle={s.pad}>
        <Btn label="Back to records" kind="ghost" small onPress={() => setScreen('records')} style={{ alignSelf: 'flex-start' }} />
        <Text style={[s.h1, { marginTop: 12, marginBottom: 12 }]}>Inspection details</Text>
        <InspectionView i={detail} marketOf={marketOf} vendorOf={vendorOf} Result={Result} />
      </ScrollView>
    );
  }

  const mine = d.inspections;
  return (
    <View style={{ flex: 1 }}>
      <Tabs tab={screen} setTab={setScreen} items={[['home', 'Market'], ['records', 'Records (' + mine.length + ')'], ['flow', 'Flow']]} />
      <ScrollView contentContainerStyle={s.pad}>
        {screen === 'flow' && <FlowPage />}
        {screen === 'home' && MARKETS.map((m) => {
          const n = mine.filter((i) => i.marketId === m.id).length;
          return (
            <View key={m.id} style={s.card}>
              <Text style={s.h2}>{m.name}</Text>
              <Text style={s.mute}>{m.area} · {m.days}</Text>
              <Text style={[s.mute, { marginBottom: 10 }]}>{n} inspection{n === 1 ? '' : 's'} recorded</Text>
              <Btn label="New inspection" onPress={() => start(m)} />
            </View>
          );
        })}
        {screen === 'records' && (mine.length === 0
          ? <Text style={s.mute}>No inspections yet. Open the market catalog and start one.</Text>
          : mine.map((i) => (
            <TouchableOpacity key={i.id} style={s.card} onPress={() => { setDetail(i); setScreen('details'); }}>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <Text style={[s.h2, { flex: 1 }]}>{vendorOf(i.vendorId)?.name}</Text>
                <Result i={i} />
              </View>
              <Text style={s.mute}>{marketOf(i.marketId).name}</Text>
              <Text style={s.mute}>{i.date} · {i.images.length} photo{i.images.length === 1 ? '' : 's'}</Text>
            </TouchableOpacity>
          )))}
      </ScrollView>
    </View>
  );
}

function InspectionView({ i, marketOf, vendorOf, Result }) {
  return (
    <View>
      <View style={s.card}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={[s.h2, { flex: 1 }]}>{vendorOf(i.vendorId)?.name}</Text>
          <Result i={i} />
        </View>
        <Text style={s.mute}>{marketOf(i.marketId).name}</Text>
        {i.date && <Text style={s.mute}>{i.date} · officer {i.officer}</Text>}
        <Text style={[s.h2, { marginTop: 10 }]}>Hygiene score: {i.hygiene} / 5</Text>
      </View>
      <View style={s.card}>
        {CHECKS.map(([k, l]) => (
          <View key={k} style={[s.row, { justifyContent: 'space-between', paddingVertical: 5 }]}>
            <Text style={{ flex: 1, color: C.ink }}>{l}</Text>
            <Pill text={i.checks[k] ? 'Yes' : 'No'} bg={isGood(k, i.checks[k]) ? C.mint : C.amber} fg={isGood(k, i.checks[k]) ? C.green : C.ink} />
          </View>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Notes</Text>
        <Text style={[s.mute, { color: C.ink }]}>{i.notes}</Text>
      </View>
      <View style={s.grid}>
        {i.images.map((u) => <View key={u} style={s.thumbWrap}><Image source={{ uri: u }} style={s.thumb} /></View>)}
      </View>
    </View>
  );
}

const F_INFO = [
  ['User', 'Market Field Officer'],
  ['Goal', 'Complete and document a market inspection'],
  ['Main flow', 'Open app to inspection details'],
];
const F_TOP = [['Open app', 'gray'], ['Home (market catalog)', 'gray'], ['New inspection', 'green'], ['Complete form', 'green']];
const F_BOTTOM = [['Add image (camera or gallery)', 'green'], ['Review', 'green'], ['Save', 'green'], ['Records', 'gray'], ['Details', 'gray']];

const FArrow = ({ label }) => (
  <View style={f.arrow}>
    <View style={f.stem} />
    <Text style={f.head}>▼</Text>
    {!!label && <Text style={f.arrowLabel}>{label}</Text>}
  </View>
);
const FNode = ({ n, label, tone }) => (
  <View style={[f.node, tone === 'green' ? f.green : f.gray]}>
    <View style={[f.num, tone === 'green' && { backgroundColor: C.green }]}>
      <Text style={[f.numT, tone === 'green' && { color: '#fff' }]}>{n}</Text>
    </View>
    <Text style={[f.nodeT, tone === 'green' && { color: C.green }]}>{label}</Text>
  </View>
);

function FlowPage() {
  return (
    <View>
      <View style={f.header}>
        {F_INFO.map(([k, v]) => (
          <View key={k} style={f.infoRow}>
            <Text style={f.infoK}>{k}</Text>
            <Text style={f.infoV}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={f.flow}>
        {F_TOP.map(([label, tone], i) => (
          <React.Fragment key={label}>
            <FNode n={i + 1} label={label} tone={tone} />
            <FArrow />
          </React.Fragment>
        ))}
        <View style={f.decisionRow}>
          <View style={{ flex: 1 }} />
          <View style={f.diamondWrap}>
            <View style={f.diamond} />
            <Text style={f.diamondT}>Valid?</Text>
          </View>
          <View style={f.errSide}>
            <Text style={f.no}>No ▶</Text>
            <View style={f.errBox}>
              <Text style={f.errT}>Show errors</Text>
              <Text style={f.errSub}>back to Complete form</Text>
            </View>
          </View>
        </View>
        <FArrow label="Yes" />
        {F_BOTTOM.map(([label, tone], i) => (
          <React.Fragment key={label}>
            <FNode n={i + 5} label={label} tone={tone} />
            {i < F_BOTTOM.length - 1 && <FArrow />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  header: { backgroundColor: C.green, borderRadius: 20, padding: 16, marginBottom: 14 },
  infoRow: { flexDirection: 'row', paddingVertical: 5 },
  infoK: { width: 84, color: C.sun, fontWeight: '700', fontSize: 14 },
  infoV: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 15 },
  flow: { width: '100%', alignItems: 'center' },
  node: { width: 260, height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  green: { backgroundColor: C.mint, borderWidth: 1, borderColor: C.green },
  gray: { backgroundColor: '#ECE8D9', borderWidth: 1, borderColor: '#C9C4B0' },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  numT: { fontSize: 12, fontWeight: '800', color: C.ink },
  nodeT: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  arrow: { height: 16, alignItems: 'center', justifyContent: 'center' },
  stem: { width: 2, height: 6, backgroundColor: C.mute },
  head: { fontSize: 8, color: C.mute, lineHeight: 8 },
  arrowLabel: { position: 'absolute', left: '50%', marginLeft: 12, fontSize: 12, fontWeight: '700', color: C.green },
  decisionRow: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 84 },
  diamondWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  diamond: { position: 'absolute', width: 58, height: 58, backgroundColor: '#F6D5CC', borderWidth: 1, borderColor: '#8A2F1B', borderRadius: 8, transform: [{ rotate: '45deg' }] },
  diamondT: { fontSize: 13, fontWeight: '800', color: '#8A2F1B' },
  errSide: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 4 },
  no: { fontSize: 12, fontWeight: '800', color: '#8A2F1B', marginRight: 4 },
  errBox: { flex: 1, backgroundColor: '#F6D5CC', borderRadius: 12, borderWidth: 1, borderColor: '#8A2F1B', paddingVertical: 6, paddingHorizontal: 8 },
  errT: { fontSize: 13, fontWeight: '800', color: '#8A2F1B' },
  errSub: { fontSize: 11, color: '#8A2F1B', marginTop: 1 },
});

const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { backgroundColor: C.green, paddingTop: SAFE + 6, paddingBottom: 16, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brand: { fontSize: 19, fontWeight: '800', color: '#fff' },
  brandSub: { fontSize: 13, color: C.sun, marginTop: 2, fontWeight: '600' },
  out: { backgroundColor: '#ffffff26', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  welcome: { flex: 1, backgroundColor: C.green, padding: 26, paddingTop: SAFE + 60, overflow: 'hidden' },
  ring1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#ffffff0F', top: -90, right: -110 },
  ring2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: C.sun + '33', bottom: -60, left: -60 },
  kicker: { color: C.sun, fontWeight: '700', fontSize: 15, marginBottom: 14 },
  hero: { fontSize: 36, fontWeight: '800', color: '#fff', lineHeight: 42 },
  heroSub: { fontSize: 16, color: '#ffffffCC', marginTop: 14, lineHeight: 22 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  h1: { fontSize: 22, fontWeight: '800', color: C.ink, marginBottom: 6 },
  h2: { fontSize: 16, fontWeight: '700', color: C.ink },
  label: { fontSize: 14, fontWeight: '700', color: C.green, marginTop: 14, marginBottom: 8 },
  mute: { fontSize: 14, color: C.mute, marginTop: 2 },
  err: { color: C.red, marginBottom: 8 },
  errBox: { backgroundColor: '#FBE9E6', borderRadius: 12, padding: 12, marginBottom: 12, marginTop: 4 },
  warn: { backgroundColor: C.amber, color: C.ink, padding: 12, borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  note: { borderRadius: 12, padding: 12, marginBottom: 10 },
  pad: { padding: 16, paddingBottom: 60 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, fontSize: 16, marginBottom: 10, color: C.ink },
  btn: { borderRadius: 14, paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1.5 },
  lift: shadow,
  btnT: { fontSize: 16, fontWeight: '700' },
  pill: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, overflow: 'hidden', marginVertical: 4 },
  chip: { backgroundColor: '#ECE8D9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, marginRight: 8, marginBottom: 8 },
  tabs: { flexDirection: 'row', backgroundColor: '#ECE8D9', margin: 14, marginBottom: 0, borderRadius: 16, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  tabOn: { backgroundColor: C.green },
  tabT: { color: C.mute, fontSize: 13 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.line, marginBottom: 2 },
  opt: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line, borderRadius: 14, padding: 14, marginBottom: 8 },
  optOn: { backgroundColor: C.green, borderColor: C.green },
  score: { flex: 1, height: 48, marginRight: 6, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  step: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.line, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  thumbWrap: { width: '48%', marginRight: '2%', marginBottom: 10 },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: 14 },
  x: { position: 'absolute', bottom: 6, right: 6, backgroundColor: '#000000AA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
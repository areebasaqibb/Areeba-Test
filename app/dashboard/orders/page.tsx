'use client';

import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Heart, Calendar, MapPin, Navigation, TrendingUp, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { BusinessContext } from '../layout';
import { formatCurrency } from '../../lib/utils';

export default function Orders() {
  const { business } = useContext(BusinessContext);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  
  // Form State
  const [orderNumber, setOrderNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [type, setType] = useState('Pickup');
  const [address, setAddress] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [orderStatus, setOrderStatus] = useState('New');
  const [total, setTotal] = useState('0');

  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  const [selectedBoxSize, setSelectedBoxSize] = useState<number | null>(null);
  const [flavorCounts, setFlavorCounts] = useState<Record<string, number>>({});

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [resO, resC, resAI, resP, resR] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/customers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/orders-insight`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/recipes`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setOrders(await resO.json());
      setCustomers(await resC.json());
      setProducts(await resP.json());
      setRecipes(await resR.json());
      
      const ai = await resAI.json();
      setAiInsight(ai.insight);
    } catch (err) {
      toast.error('Failed to load orders');
    }
  };

  const menuItems = [
    ...products.map(p => ({ id: p.id, name: p.name, type: 'Product', price: p.sellingPrice || 0, flavors: p.flavors || [] }))
  ].sort((a, b) => a.name.localeCompare(b.name));

  const handleAddItem = () => {
    if (!selectedMenuItem) return;
    const item = menuItems.find(i => i.id === selectedMenuItem);
    if (!item) return;

    let notes = '';
    let finalPrice = item.price;
    const selectedFlavors: any[] = [];
    
    if (selectedBoxSize) {
      const totalSelected = Object.values(flavorCounts).reduce((a, b) => a + b, 0);
      if (totalSelected !== selectedBoxSize) {
        toast.error(`Please select exactly ${selectedBoxSize} flavors for the box.`);
        return;
      }
      const flavorParts = [];
      let flavorCost = 0;
      for (const [flavorName, count] of Object.entries(flavorCounts)) {
        if (count > 0) {
          flavorParts.push(`${count}x ${flavorName}`);
          const f = item.flavors.find((fl: any) => fl.name === flavorName);
          if (f) {
            flavorCost += (f.suggestedPrice || 0) * count;
            selectedFlavors.push({ productFlavorId: f.id, quantity: count });
          }
        }
      }
      notes = `Box of ${selectedBoxSize} (${flavorParts.join(', ')})`;
      finalPrice += flavorCost;
    }
    
    const newItems = [...orderItems, { ...item, quantity: itemQuantity, notes, flavors: selectedFlavors, price: finalPrice }];
    setOrderItems(newItems);
    
    const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    setTotal(String(Math.round(newTotal / 10) * 10));
    
    setSelectedMenuItem('');
    setItemQuantity(1);
    setSelectedBoxSize(null);
    setFlavorCounts({});
  };

  useEffect(() => {
    if (business) loadData();
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Auto-generate order number if empty
    const num = orderNumber || `ORD-${Math.floor(Math.random() * 10000)}`;
    let finalCustomerId = customerId;

    try {
      if (isNewCustomer && customerSearchQuery) {
        const custRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/customers`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: customerSearchQuery })
        });
        if (!custRes.ok) throw new Error('Failed to create customer');
        const newCust = await custRes.json();
        finalCustomerId = newCust.id;
      }

      const url = editingOrderId ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders/${editingOrderId}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders`;
      const method = editingOrderId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: num,
          customerId: finalCustomerId,
          deliveryDate,
          type,
          address,
          paymentStatus,
          orderStatus,
          total: parseFloat(total),
          items: orderItems.map(i => ({
            productId: i.type === 'Product' ? i.id : null,
            recipeId: i.type === 'Recipe' ? i.id : null,
            quantity: i.quantity,
            priceAtTime: i.price,
            notes: i.notes || null
          }))
        })
      });
      if (!res.ok) throw new Error();
      toast.success(editingOrderId ? 'Order updated!' : 'Order added!');
      setIsModalOpen(false);
      loadData();
    } catch(err) {
      toast.error('Failed to save order');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      toast.success('Order deleted');
      loadData();
    } catch(err) {
      toast.error('Failed to delete order');
    }
  };

  const openModal = () => {
    setEditingOrderId(null);
    setOrderNumber(''); setCustomerId(''); setDeliveryDate(''); setType('Pickup'); 
    setAddress(''); setPaymentStatus('Pending'); setOrderStatus('New'); setTotal('0');
    setCustomerSearchQuery(''); setShowCustomerDropdown(false); setIsNewCustomer(false);
    setOrderItems([]); setSelectedMenuItem(''); setItemQuantity(1);
    setSelectedBoxSize(null); setFlavorCounts({});
    setIsModalOpen(true);
  };

  const openEditModal = (order: any) => {
    setEditingOrderId(order.id);
    setOrderNumber(order.orderNumber);
    setCustomerId(order.customerId);
    
    // Set customer search query for display
    const cust = customers.find(c => c.id === order.customerId);
    if (cust) setCustomerSearchQuery(cust.name);
    
    setDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().slice(0, 16) : '');
    setType(order.type);
    setAddress(order.address || '');
    setPaymentStatus(order.paymentStatus);
    setOrderStatus(order.orderStatus);
    setTotal(String(order.total));
    
    // Map existing order items back to the state format
    const mappedItems = order.items.map((i: any) => {
      const isProduct = !!i.productId;
      const ref = isProduct ? i.product : i.recipe;
      return {
        id: isProduct ? i.productId : i.recipeId,
        name: ref?.name || 'Unknown Item',
        type: isProduct ? 'Product' : 'Recipe',
        price: i.priceAtTime,
        quantity: i.quantity,
        notes: i.notes || null,
        flavors: ref?.flavors || []
      };
    });
    setOrderItems(mappedItems);
    
    setSelectedMenuItem(''); setItemQuantity(1);
    setSelectedBoxSize(null); setFlavorCounts({});
    setIsModalOpen(true);
  };

  const statuses = ['New', 'Confirmed', 'Preparing', 'Ready', 'Completed'];

  const moveOrder = async (order: any, direction: number) => {
    const currentIndex = statuses.indexOf(order.orderStatus);
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= statuses.length) return;
    updateOrderStatus(order, statuses[newIndex]);
  };

  const updateOrderStatus = async (order: any, newStatus: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, orderStatus: newStatus })
      });
      if (!res.ok) throw new Error();
      loadData();
      toast.success(`Moved to ${newStatus}`);
    } catch(err) {
      toast.error('Failed to update order');
    }
  };

  const updatePaymentStatus = async (order: any, newStatus: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, paymentStatus: newStatus })
      });
      if (!res.ok) throw new Error();
      loadData();
      toast.success(`Payment marked as ${newStatus}`);
    } catch(err) {
      toast.error('Failed to update payment');
    }
  };

  if (!business) return null;

  const getAiMessage = () => {
    const pending = orders.filter(o => o.orderStatus !== 'Completed');
    if (pending.length === 0) return 'All caught up! No active orders right now.';
    
    const sorted = [...pending].sort((a,b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
    const next = sorted[0];
    
    const isToday = new Date(next.deliveryDate).toDateString() === new Date().toDateString();
    const isTomorrow = new Date(next.deliveryDate).toDateString() === new Date(Date.now() + 86400000).toDateString();
    
    const timeFrame = isToday ? 'today' : isTomorrow ? 'tomorrow' : 'soon';
    
    return `${pending.length} active order${pending.length > 1 ? 's' : ''}. 1 order due ${timeFrame}: ${next.customer?.name || 'Customer'}'s ${next.type}`;
  };

  const displayAiInsight = orders.length > 0 ? getAiMessage() : aiInsight;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Sweet Orders</h1>
        <button className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm" onClick={openModal}>
          <Plus size={18} /> New Order
        </button>
      </div>

      {aiInsight && (
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <Sparkles className="text-primary shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-primary">AI Bakery Manager</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{displayAiInsight}</p>
          </div>
        </div>
      )}

      {/* Grid Kanban Board (3 columns per row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
        {statuses.map(status => {
          const columnOrders = orders.filter(o => o.orderStatus === status);
          
          return (
            <div key={status} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 flex flex-col max-h-[75vh]">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300">{status}</h3>
                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    {columnOrders.length}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {columnOrders.length === 0 ? (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium">
                    No orders yet
                  </div>
                ) : (
                  columnOrders.map(o => (
                    <div key={o.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                    
                    {/* Header: Order Number and Type */}
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{o.orderNumber}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md font-medium">{o.type}</span>
                        <button 
                          onClick={() => openEditModal(o)}
                          className="text-slate-400 hover:text-primary transition-colors p-1"
                          title="Edit Order"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(o.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Delete Order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div>
                      <p className="font-bold text-primary text-base">{o.customer?.name || 'Unknown Customer'}</p>
                      {o.customer?.phone && (
                        <p className="text-xs text-slate-500 mt-0.5">{o.customer.phone}</p>
                      )}
                    </div>

                    {/* Items List */}
                    {o.items && o.items.length > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-sm">
                        <ul className="space-y-1">
                          {o.items.map((item: any) => (
                            <li key={item.id} className="flex flex-col text-slate-600 dark:text-slate-300">
                              <span>{item.quantity}x {item.product?.name || item.recipe?.name || 'Unknown Item'}</span>
                              {item.notes && <span className="text-xs text-slate-500 pl-4 border-l-2 border-slate-200 mt-0.5">{item.notes}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Meta: Due Date & Payment Status */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Calendar size={14} className="shrink-0" />
                        <span>{new Date(o.deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-end">
                        <select
                          className={`appearance-none text-center cursor-pointer px-2 py-1 rounded-full font-bold text-xs focus:outline-none focus:ring-1 focus:ring-primary ${
                            o.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                            o.paymentStatus === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                          value={o.paymentStatus}
                          onChange={(e) => updatePaymentStatus(o, e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Partially Paid">Partially Paid</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>
                    </div>

                    {/* Footer: Total & Status Changer */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(o.total, business.currency, 'en')}
                      </span>
                      
                      <select 
                        className="text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md py-1.5 px-2 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        value={o.orderStatus}
                        onChange={(e) => updateOrderStatus(o, e.target.value)}
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">{editingOrderId ? 'Edit Order' : 'New Order'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="input-group relative">
                <label>Customer Name</label>
                <input 
                  type="text" 
                  className="input w-full" 
                  placeholder="Type to search or add..."
                  value={customerSearchQuery}
                  onChange={e => {
                    setCustomerSearchQuery(e.target.value);
                    setShowCustomerDropdown(true);
                    setCustomerId('');
                    setIsNewCustomer(false);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  required
                />
                
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).map(c => (
                      <div 
                        key={c.id} 
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0"
                        onClick={() => {
                          setCustomerId(c.id);
                          setCustomerSearchQuery(c.name);
                          setIsNewCustomer(false);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                        {c.phone && <span className="ml-2 text-xs text-slate-500">{c.phone}</span>}
                      </div>
                    ))}
                    
                    {customerSearchQuery && !customers.some(c => c.name.toLowerCase() === customerSearchQuery.toLowerCase()) && (
                      <div 
                        className="p-3 hover:bg-primary/10 text-primary cursor-pointer font-medium border-t border-slate-100 dark:border-slate-700 flex items-center gap-2"
                        onClick={() => {
                          setIsNewCustomer(true);
                          setCustomerId('');
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <Plus size={16} /> Add "{customerSearchQuery}" as new customer
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Delivery Date</label>
                  <input type="date" className="input" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} required/>
                </div>
                <div className="input-group">
                  <label>Type</label>
                  <select className="input" value={type} onChange={e => setType(e.target.value)}>
                    <option value="Pickup">Pickup</option>
                    <option value="Delivery">Delivery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Order Status</label>
                  <select className="input" value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
                    <option value="New">New</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Ready">Ready</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Payment</label>
                  <select className="input" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Order Items Section */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-sm mb-3">Order Items</h3>
                
                {orderItems.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 text-sm">
                        <div>
                          <span className="font-bold">{item.quantity}x</span> {item.name}
                          {item.notes && <div className="text-xs text-slate-500 mt-1 pl-3 border-l-2 border-slate-200">{item.notes}</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{business.currency} {Math.round((item.price * item.quantity) / 10) * 10}</span>
                          <button 
                            type="button" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                            onClick={() => {
                              const newItems = orderItems.filter((_, i) => i !== idx);
                              setOrderItems(newItems);
                              const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
                              setTotal(String(Math.round(newTotal / 10) * 10));
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2 items-end">
                  <div className="flex-1 input-group !mb-0">
                    <label className="text-xs">Select Item</label>
                    <select className="input text-sm py-2" value={selectedMenuItem} onChange={e => setSelectedMenuItem(e.target.value)}>
                      <option value="">Choose product or recipe...</option>
                      {menuItems.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({business.currency} {m.price})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20 input-group !mb-0">
                    <label className="text-xs">Qty</label>
                    <input type="number" min="1" className="input text-sm py-2" value={itemQuantity} onChange={e => setItemQuantity(parseInt(e.target.value) || 1)} />
                  </div>
                  <button type="button" className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors" onClick={handleAddItem}>
                    Add
                  </button>
                </div>
                
                {selectedMenuItem && menuItems.find(i => i.id === selectedMenuItem)?.flavors?.length > 0 && (
                  <div className="mt-4 p-4 border border-primary/20 bg-primary/5 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                        Flavor Builder
                      </h4>
                      <select 
                        className="input !w-auto !py-1 !text-xs !mb-0" 
                        value={selectedBoxSize || ''} 
                        onChange={e => {
                          setSelectedBoxSize(parseInt(e.target.value) || null);
                          setFlavorCounts({});
                        }}
                      >
                        <option value="">Select Box Size...</option>
                        <option value="3">Box of 3</option>
                        <option value="4">Box of 4</option>
                        <option value="6">Box of 6</option>
                        <option value="12">Box of 12</option>
                      </select>
                    </div>
                    
                    {selectedBoxSize && (
                      <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                          <span>Select {selectedBoxSize} flavors:</span>
                          <span className={Object.values(flavorCounts).reduce((a, b) => a + b, 0) === selectedBoxSize ? "text-green-600 font-bold" : ""}>
                            {Object.values(flavorCounts).reduce((a, b) => a + b, 0)} / {selectedBoxSize}
                          </span>
                        </div>
                        {menuItems.find(i => i.id === selectedMenuItem)?.flavors?.map((f: any) => (
                          <div key={f.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium">
                              {f.name} <span className="text-slate-400 font-normal">({business.currency} {f.suggestedPrice || 0})</span>
                            </span>
                            <div className="flex items-center gap-3">
                              <button 
                                type="button" 
                                className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                                onClick={() => setFlavorCounts(prev => ({ ...prev, [f.name]: Math.max(0, (prev[f.name] || 0) - 1) }))}
                              >
                                -
                              </button>
                              <span className="text-sm font-bold w-4 text-center">{flavorCounts[f.name] || 0}</span>
                              <button 
                                type="button" 
                                className="w-6 h-6 flex items-center justify-center bg-primary hover:opacity-90 rounded-full text-white transition-colors"
                                onClick={() => {
                                  const currentTotal = Object.values(flavorCounts).reduce((a, b) => a + b, 0);
                                  if (currentTotal < selectedBoxSize) {
                                    setFlavorCounts(prev => ({ ...prev, [f.name]: (prev[f.name] || 0) + 1 }));
                                  }
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="input-group">
                <label>Total ({business.currency})</label>
                <input type="number" step="10" className="input" value={total} onChange={e => setTotal(e.target.value)} required/>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingOrderId ? 'Save Changes' : 'Create Order'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

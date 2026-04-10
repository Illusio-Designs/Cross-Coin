'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';



const TABS = [
{ key: 'men', label: 'Men' },
{ key: 'women', label: 'Women' },
{ key: 'kids', label: 'Kids' }];


const SIZE_DATA = {
  men: [
  { uk: '6', eu: '39', us: '7' },
  { uk: '7', eu: '40', us: '8' },
  { uk: '8', eu: '41', us: '9' },
  { uk: '9', eu: '42', us: '10' },
  { uk: '10', eu: '43', us: '11' },
  { uk: '11', eu: '44', us: '12' },
  { uk: '12', eu: '46', us: '13' }],

  women: [
  { uk: '3', eu: '36', us: '5' },
  { uk: '4', eu: '37', us: '6' },
  { uk: '5', eu: '38', us: '7' },
  { uk: '6', eu: '39', us: '8' },
  { uk: '7', eu: '40', us: '9' },
  { uk: '8', eu: '41', us: '10' },
  { uk: '9', eu: '42', us: '11' }],

  kids: [
  { uk: '1', eu: '33', us: '2' },
  { uk: '2', eu: '34', us: '3' },
  { uk: '3', eu: '35', us: '4' },
  { uk: '4', eu: '36', us: '5' },
  { uk: '5', eu: '37', us: '6' },
  { uk: '6', eu: '38', us: '7' }]

};

const FIT_GUIDE = [
{ label: 'Slim', description: 'A close, streamlined fit. Best for narrow feet.' },
{ label: 'Regular', description: 'Our standard fit. Works for most foot shapes.' },
{ label: 'Relaxed', description: 'A roomier fit with extra toe box space.' }];


export function SizeGuideClient() {
  const [activeTab, setActiveTab] = useState('men');

  return (
    <>
      {/* Header + table */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-16 md:px-10 lg:px-16">
        <div className="mx-auto max-w-site">
          <div className="mb-12 text-center">
            <h1 className="font-display text-4xl font-normal text-brand-black lg:text-5xl">
              Size Guide
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-gray-600">
              Not sure of your size? Use this guide to find your perfect fit.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="relative mb-10 flex gap-1 rounded-full border border-gray-200 bg-gray-100 p-1 w-fit mx-auto">
            {TABS.map((tab) =>
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
                activeTab === tab.key ? 'text-brand-black' : 'text-gray-600 hover:text-brand-black'
              )}>
              
                {activeTab === tab.key &&
              <motion.span
                layoutId="tab-bg"
                className="absolute inset-0 rounded-full bg-white shadow-sm"
                transition={{ duration: 0.2, ease: 'easeOut' }} />

              }
                <span className="relative">{tab.label}</span>
              </button>
            )}
          </div>

          {/* Size table */}
          <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-off-white">
                  {['UK', 'EU', 'US'].map((h) =>
                  <th
                    key={h}
                    className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-widest text-gray-600">
                    
                      {h}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {SIZE_DATA[activeTab].map((row, i) =>
                <tr
                  key={row.uk}
                  className={cn(
                    'border-b border-gray-200 last:border-0',
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-100/40'
                  )}>
                  
                    <td className="px-6 py-3.5 text-gray-800">{row.uk}</td>
                    <td className="px-6 py-3.5 text-gray-800">{row.eu}</td>
                    <td className="px-6 py-3.5 text-gray-800">{row.us}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How to measure */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white px-6 py-16 md:px-10 lg:px-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 font-display text-2xl font-normal text-brand-black">
            How to measure
          </h2>
          <ol className="flex flex-col gap-4">
            {[
            'Place a piece of paper on a hard floor and stand on it with your heel against a wall.',
            'Mark the tip of your longest toe with a pencil.',
            'Measure the distance from the wall to the mark in centimetres.',
            'Use the measurement to find your size in the table above.'].
            map((step, i) =>
            <li key={i} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage/10 text-xs font-medium text-sage">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-gray-600 pt-0.5">{step}</p>
              </li>
            )}
          </ol>
        </div>
      </section>

      {/* Fit guide */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-16 md:px-10 lg:px-16">
        <div className="mx-auto max-w-site">
          <h2 className="mb-6 font-display text-2xl font-normal text-brand-black">Fit guide</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FIT_GUIDE.map((fit) =>
            <div key={fit.label} className="rounded-2xl border border-gray-200 p-6">
                <p className="text-sm font-medium text-brand-black">{fit.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{fit.description}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>);

}
import { supabase } from './supabase';

const materialsToSeed = [
    {
        name: 'OPC Cement (50kg)',
        category: 'Binder',
        price: 12500,
        unit: 'Bag',
        trend: 'up',
        benchmark: 11800,
        range: '₦11,200 - ₦13,500',
        delta: '+4.2%',
        history: [11000, 11500, 11800, 12500],
        usage: 'Primary binder for all concrete works, plastering, and block making.',
        regions: { 'Lagos': 12500, 'Abuja': 13200, 'Port Harcourt': 12900 }
    },
    {
        name: 'Reinforcement Steel (12mm)',
        category: 'Metal',
        price: 1150000,
        unit: 'Ton',
        trend: 'down',
        benchmark: 1200000,
        range: '₦1,120,000 - ₦1,250,000',
        delta: '-2.1%',
        history: [1250000, 1220000, 1200000, 1150000],
        usage: 'High-tensile reinforcement for structural concrete elements.'
    },
    {
        name: 'Sharp Sand (Clean)',
        category: 'Aggregates',
        price: 28000,
        unit: 'Ton',
        trend: 'stable',
        benchmark: 28000,
        range: '₦26,000 - ₦30,000',
        delta: '0.0%',
        history: [27500, 28000, 28000, 28000],
        usage: 'Essential for concrete production and mortar mixes.'
    },
    {
        name: 'Granite (20mm)',
        category: 'Aggregates',
        price: 35000,
        unit: 'Ton',
        trend: 'up',
        benchmark: 32000,
        range: '₦30,000 - ₦38,000',
        delta: '+3.5%',
        history: [30000, 31000, 32000, 35000],
        usage: 'Coarse aggregate for structural concrete mixing.'
    },
    {
        name: 'Bitumen (Cold Mix)',
        category: 'Surface',
        price: 185000,
        unit: 'Drum',
        trend: 'up',
        benchmark: 172000,
        range: '₦170,000 - ₦195,000',
        delta: '+7.5%',
        history: [165000, 170000, 172000, 185000],
        usage: 'Asphaltic surface dressing for road pavements.'
    },
    {
        name: 'Laterite (Filling)',
        category: 'Earthworks',
        price: 12000,
        unit: 'm³',
        trend: 'stable',
        benchmark: 12000,
        range: '₦10,000 - ₦14,000',
        delta: '0.0%',
        history: [11500, 12000, 12000, 12000],
        usage: 'Backfilling and sub-grade material for road construction.'
    }
];

const indicesToSeed = [
    { label: 'Overall CMCI', val: 142.5, delta: '+1.4%', trend: 'up' },
    { label: 'Binder Index', val: 156.2, delta: '+3.2%', trend: 'up' },
    { label: 'Metal Index', val: 128.9, delta: '-0.8%', trend: 'down' },
    { label: 'Aggregates', val: 115.4, delta: '+0.2%', trend: 'up' },
];

export const seedMarketData = async () => {
    console.log('🚀 Starting Market Data Seed...');
    try {
        // Seed Materials
        const { error: matError } = await supabase
            .from('materials')
            .upsert(materialsToSeed, { onConflict: 'name' });

        if (matError) throw matError;
        console.log('✅ Materials seeded successfully.');

        // Seed Indices
        const { error: idxError } = await supabase
            .from('market_indices')
            .upsert(indicesToSeed, { onConflict: 'label' });

        if (idxError) throw idxError;
        console.log('✅ Market indices seeded successfully.');

        return true;
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        return false;
    }
};

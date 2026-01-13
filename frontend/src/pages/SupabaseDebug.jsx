import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { scoresApi } from '../lib/scores';

const SupabaseDebug = () => {
    const { user } = useAuth();
    const [testResult, setTestResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const runTest = async () => {
        setLoading(true);
        setTestResult(null);
        try {
            const logs = [];
            const log = (msg) => logs.push(msg);

            log(`User ID: ${user ? user.id : 'Not Logged In'}`);
            if (!user) {
                setTestResult({ success: false, logs, error: "Please log in first!" });
                setLoading(false);
                return;
            }

            // 1. Test Read
            log("Attempting to read from 'scores'...");
            const { data: readData, error: readError } = await supabase
                .from('scores')
                .select('*')
                .limit(1);

            if (readError) {
                log(`Read Error: ${readError.message} (Code: ${readError.code})`);
                log(`Hint: ${readError.hint}`);
            } else {
                log(`Read Success! Found ${readData.length} rows.`);
            }

            // 2. Test Write (Upsert)
            log("Attempting to write dummy score...");
            const testScore = Math.floor(Math.random() * 100);
            const { success, data, error: writeError } = await scoresApi.submitScore(
                user.id,
                "DebugUser",
                "debug-game",
                testScore
            );

            if (writeError) {
                log(`Write Error: ${writeError.message || JSON.stringify(writeError)}`);
            } else if (success) {
                log(`Write Success! Data: ${JSON.stringify(data)}`);
            } else {
                log("Write performed but no new high score (this is expected if score is low).");
            }

            setTestResult({ success: !readError && !writeError, logs });

        } catch (e) {
            setTestResult({ success: false, logs: [`Crash: ${e.message}`] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 bg-gray-900 min-h-screen text-white font-mono">
            <h1 className="text-3xl font-bold mb-4 text-neon-blue">Supabase Debugger</h1>

            <div className="mb-6 p-4 border border-gray-700 rounded bg-black/50">
                <h2 className="text-xl font-bold mb-2">Auth Status</h2>
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{user ? `Logged in as: ${user.email}` : 'NOT LOGGED IN'}</span>
                </div>
                {user && <p className="text-xs text-gray-500 mt-1">ID: {user.id}</p>}
            </div>

            <button
                onClick={runTest}
                disabled={loading}
                className="px-6 py-2 bg-neon-blue text-black font-bold rounded hover:bg-white transition-all disabled:opacity-50"
            >
                {loading ? 'Running Tests...' : 'Run Connection Test'}
            </button>

            {testResult && (
                <div className={`mt-6 p-4 border rounded ${testResult.success ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
                    <h3 className="text-lg font-bold mb-2">{testResult.success ? 'SUCCESS' : 'ISSUES DETECTED'}</h3>
                    {testResult.error && <p className="text-red-400 font-bold mb-2">{testResult.error}</p>}
                    <div className="bg-black p-4 rounded text-xs gap-1 flex flex-col">
                        {testResult.logs.map((L, i) => (
                            <div key={i} className="border-b border-gray-800 pb-1 mb-1 last:border-0">{L}</div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-8 text-xs text-gray-600">
                <p>Supabase Url: {import.meta.env.VITE_SUPABASE_URL || "Hardcoded (Check supabaseClient.js)"}</p>
                <p>Supabase Key: {import.meta.env.VITE_SUPABASE_KEY ? "Loaded from Env" : "Using Hardcoded Fallback"}</p>
            </div>
        </div>
    );
};

export default SupabaseDebug;

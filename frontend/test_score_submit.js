import { createClient } from '@supabase/supabase-js';

const url = 'https://ykenqvffnojqbykjjvja.supabase.co';
const key = 'sb_publishable_ZPg7FO-1N7IHao7O4Mm3mQ_rbArOgGO';
const supabase = createClient(url, key);

// COPY OF THE LOGIC FROM scores.js (UPDATED VERSION)
const scoresApi = {
    submitScore: async (userId, username, gameId, newScore) => {
        console.log(`[Scores] Submitting: User=${userId}, Game=${gameId}, Score=${newScore}`);
        if (!userId) {
            console.error("[Scores] No user ID provided.");
            return { error: "User not logged in" };
        }

        try {
            // 1. Check existing score
            const { data: existingData, error: fetchError } = await supabase
                .from('scores')
                .select('high_score, id')
                .eq('user_id', userId)
                .eq('game_id', gameId)
                .order('high_score', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fetchError) {
                console.error("[Scores] Error fetching existing score:", fetchError);
                throw fetchError;
            }

            console.log("[Scores] Existing data:", existingData);

            const currentHighScore = existingData?.high_score || 0;

            if (newScore > currentHighScore) {
                if (existingData?.id) {
                    console.log(`[Scores] Updating existing ID ${existingData.id} with ${newScore}`);
                    // Update existing row
                    const { data, error } = await supabase
                        .from('scores')
                        .update({ high_score: newScore, username: username })
                        .eq('id', existingData.id)
                        .select();

                    if (error) {
                        console.error("[Scores] Update failed:", error); // IF RLS FAILS, THIS SHOULD SHOW
                        throw error;
                    }
                    console.log("[Scores] Update success:", data);
                    return { success: true, newHighScore: true, data };
                } else {
                    console.log(`[Scores] Inserting new record for ${newScore}`);
                    // Insert new row
                    const { data, error } = await supabase
                        .from('scores')
                        .insert({
                            user_id: userId,
                            username: username,
                            game_id: gameId,
                            high_score: newScore
                        })
                        .select();

                    if (error) {
                        console.error("[Scores] Insert failed:", error);
                        throw error;
                    }
                    console.log("[Scores] Insert success:", data);
                    return { success: true, newHighScore: true, data };
                }
            } else {
                console.log(`[Scores] New score ${newScore} is not higher than ${currentHighScore}`);
                return { success: true, newHighScore: false };
            }

        } catch (error) {
            console.error("[Scores] Unexpected error:", error);
            return { error };
        }
    },

    getUserBest: async (userId, gameId) => {
        const { data } = await supabase
            .from('scores')
            .select('high_score')
            .eq('user_id', userId)
            .eq('game_id', gameId)
            .order('high_score', { ascending: false })
            .limit(1)
            .maybeSingle();
        return data?.high_score || 0;
    }
};

async function test() {
    console.log("Starting test...");

    // 1. Sign up/Sign in random user
    // Use timestamp but ensure safe chars.
    const uniqueId = Date.now().toString();
    const email = `test_user_${uniqueId}@example.com`;
    const password = 'password123';
    console.log("Creating user:", email);

    const { data: { user }, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username: 'Tester' }
        }
    });

    if (authError) {
        console.error("Auth error:", authError);
        return;
    }

    if (!user) {
        console.error("No user created?");
        return;
    }

    console.log("User created:", user.id);

    const gameId = 'flappy-neon';

    // 2. Submit initial score
    console.log("\n--- TEST 1: Submit 100 ---");
    await scoresApi.submitScore(user.id, 'Tester', gameId, 100);
    let best = await scoresApi.getUserBest(user.id, gameId);
    console.log("Check Best:", best);
    if (best !== 100) console.error("FAIL: Expected 100");

    // 3. Submit higher
    console.log("\n--- TEST 2: Submit 200 ---");
    await scoresApi.submitScore(user.id, 'Tester', gameId, 200);
    best = await scoresApi.getUserBest(user.id, gameId);
    console.log("Check Best Check:", best);

    // Check if duplicate rows created?
    const { count } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('game_id', gameId);
    console.log("Row count for user/game:", count);

    if (best !== 200) console.error("FAIL: Expected 200");
    if (count > 1) console.warn("WARNING: Multiple rows created!");

    console.log("\nTest Complete.");
}

test();

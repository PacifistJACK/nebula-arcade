import { supabase } from './supabaseClient';

export const scoresApi = {
    /**
     * Submit a score for a game. 
     * Updates only if the new score is higher than the existing one (handled by upsert logic if we want, 
     * but standard SQL upsert updates on conflict. To *only* keep highest, we might need a check or conditional update).
     * 
     * Actually, with the unique constraint, an upsert will replace the row. 
     * We want to keep the HIGHEST. 
     * So we should query first or use a conditional update strategy.
     * Querying first is safer and easier to understand.
     */
    submitScore: async (userId, username, gameId, newScore) => {
        console.log(`[Scores] 📤 Submitting: User=${userId}, Game=${gameId}, Score=${newScore}, Username="${username}"`);

        if (!userId) {
            console.error("[Scores] ❌ ERROR: No user ID provided. User must be logged in to save scores.");
            return { error: "User not logged in", success: false };
        }

        if (!gameId) {
            console.error("[Scores] ❌ ERROR: No game ID provided.");
            return { error: "Game ID required", success: false };
        }

        const scoreNum = Number(newScore);
        if (isNaN(scoreNum) || scoreNum < 0) {
            console.error(`[Scores] ❌ ERROR: Invalid score value: ${newScore}`);
            return { error: "Invalid score", success: false };
        }

        const validUsername = username || "Anonymous";

        try {
            // 1. Check existing score
            console.log(`[Scores] 🔍 Checking existing scores for user ${userId} in game ${gameId}...`);
            const { data: existingData, error: fetchError } = await supabase
                .from('scores')
                .select('high_score, id')
                .eq('user_id', userId)
                .eq('game_id', gameId)
                .order('high_score', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fetchError) {
                console.error("[Scores] ❌ ERROR fetching existing score:", fetchError);
                return { error: fetchError, success: false };
            }

            console.log("[Scores] 📊 Existing data:", existingData);

            const currentHighScore = Number(existingData?.high_score) || 0;
            console.log(`[Scores] 📈 Current high score: ${currentHighScore}, New score: ${scoreNum}`);

            if (scoreNum > currentHighScore) {
                if (existingData?.id) {
                    console.log(`[Scores] ⬆️ Updating existing record (ID: ${existingData.id}) with new high score: ${scoreNum}`);
                    // Update existing row
                    const { data, error } = await supabase
                        .from('scores')
                        .update({ high_score: scoreNum, username: validUsername })
                        .eq('id', existingData.id)
                        .select();

                    if (error) {
                        console.error("[Scores] ❌ ERROR: Update failed:", error);
                        return { error, success: false };
                    }
                    console.log("[Scores] ✅ Update successful! New high score saved:", data);
                    return { success: true, newHighScore: true, data, previousBest: currentHighScore };
                } else {
                    console.log(`[Scores] ➕ Inserting new record for user ${userId} with score ${scoreNum}`);
                    // Insert new row
                    const { data, error } = await supabase
                        .from('scores')
                        .insert({
                            user_id: userId,
                            username: validUsername,
                            game_id: gameId,
                            high_score: scoreNum
                        })
                        .select();

                    if (error) {
                        console.error("[Scores] ❌ ERROR: Insert failed:", error);
                        return { error, success: false };
                    }
                    console.log("[Scores] ✅ Insert successful! First score saved:", data);
                    return { success: true, newHighScore: true, data, previousBest: 0 };
                }
            } else {
                console.log(`[Scores] ⏭️ Score ${scoreNum} is not higher than current best ${currentHighScore}. Not updating.`);
                return { success: true, newHighScore: false, currentBest: currentHighScore };
            }

        } catch (error) {
            console.error("[Scores] ❌ UNEXPECTED ERROR:", error);
            console.error("[Scores] Error details:", JSON.stringify(error, null, 2));
            return { error, success: false };
        }
    },

    /**
     * Get the high score for the current user in a specific game.
     */
    getUserBest: async (userId, gameId) => {
        if (!userId) {
            console.warn(`[Scores] ⚠️ getUserBest called without userId for game ${gameId}`);
            return 0;
        }

        if (!gameId) {
            console.error("[Scores] ❌ ERROR: getUserBest called without gameId");
            return 0;
        }

        console.log(`[Scores] 🔍 Fetching personal best for user ${userId} in game ${gameId}...`);

        try {
            const { data, error } = await supabase
                .from('scores')
                .select('high_score')
                .eq('user_id', userId)
                .eq('game_id', gameId)
                .order('high_score', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error(`[Scores] ❌ ERROR fetching user best for ${gameId}:`, error);
                return 0;
            }

            const bestScore = data?.high_score || 0;
            console.log(`[Scores] 🏆 Personal best for ${gameId}: ${bestScore}`);
            return bestScore;
        } catch (error) {
            console.error(`[Scores] ❌ UNEXPECTED ERROR fetching user best for ${gameId}:`, error);
            return 0;
        }
    },

    /**
     * Get the global leaderboard for a game.
     * Fetches more rows than needed and deduplicates by username to ensure unique players.
     */
    getLeaderboard: async (gameId, limit = 10) => {
        if (!gameId) {
            console.error("[Scores] ❌ ERROR: getLeaderboard called without gameId");
            return [];
        }

        console.log(`[Scores] 🏅 Fetching leaderboard for game ${gameId} (limit: ${limit})...`);

        try {
            // Fetch 50 to allow for duplicates/updates
            const { data, error } = await supabase
                .from('scores')
                .select('username, high_score, user_id')
                .eq('game_id', gameId)
                .order('high_score', { ascending: false })
                .limit(50);

            if (error) {
                console.error(`[Scores] ❌ ERROR fetching leaderboard for ${gameId}:`, error);
                throw error;
            }

            console.log(`[Scores] 📊 Fetched ${data?.length || 0} score entries for ${gameId}`);

            // Deduplicate by user_id logic: keep only the first (highest) occurrence
            const uniqueScores = [];
            const seenUsers = new Set();

            for (const entry of data) {
                // Use user_id for uniqueness if available, otherwise username
                const key = entry.user_id || entry.username;
                if (!seenUsers.has(key)) {
                    seenUsers.add(key);
                    uniqueScores.push({ username: entry.username, score: entry.high_score });
                }
                if (uniqueScores.length >= limit) break;
            }

            console.log(`[Scores] ✅ Leaderboard for ${gameId}: ${uniqueScores.length} unique entries`);
            console.log(`[Scores] Top 3:`, uniqueScores.slice(0, 3));

            return uniqueScores;
        } catch (error) {
            console.error(`[Scores] ❌ UNEXPECTED ERROR fetching leaderboard for ${gameId}:`, error);
            return [];
        }
    }
};

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
                        console.error("[Scores] Update failed:", error);
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

    /**
     * Get the high score for the current user in a specific game.
     */
    getUserBest: async (userId, gameId) => {
        if (!userId) return 0;
        try {
            const { data, error } = await supabase
                .from('scores')
                .select('high_score')
                .eq('user_id', userId)
                .eq('game_id', gameId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return 0;
                throw error;
            }
            return data?.high_score || 0;
        } catch (error) {
            console.error("Error fetching user best:", error);
            return 0;
        }
    },

    /**
     * Get the global leaderboard for a game.
     */
    getLeaderboard: async (gameId, limit = 10) => {
        try {
            const { data, error } = await supabase
                .from('scores')
                .select('username, high_score')
                .eq('game_id', gameId)
                .order('high_score', { ascending: false })
                .limit(limit);

            if (error) throw error;
            // Map back to 'score' for local components if they rely on it, OR just return as is and update components?
            // The components expect { username, score } object structure in the array.
            // Let's map it so we don't have to change 6 files again.
            return data.map(d => ({ username: d.username, score: d.high_score }));
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            return [];
        }
    }
};

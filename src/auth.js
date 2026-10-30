import { supabase, hasSupabase } from "./storage.js";

// ↓↓↓ PUT YOUR DISCORD USER ID HERE ↓↓↓
const ALLOWED_DISCORD_ID = "PASTE_YOUR_DISCORD_USER_ID_HERE";
// ↑↑↑ Example: "123456789012345678"

let currentUser = null;
let authListeners = [];

export function getUser() {
  return currentUser;
}

export function onAuthChange(fn) {
  authListeners.push(fn);
  fn(currentUser);
}

function notify() {
  authListeners.forEach(fn => fn(currentUser));
}

function isAllowedUser(user) {
  if (!user) return false;

  // Discord identity
  const identities = user.identities || [];
  const discordIdentity = identities.find(i => i.provider === "discord");

  if (discordIdentity) {
    return discordIdentity.id === ALLOWED_DISCORD_ID;
  }

  // Fallbacks
  return (
    user.user_metadata?.provider_id === ALLOWED_DISCORD_ID ||
    user.user_metadata?.sub === ALLOWED_DISCORD_ID
  );
}

export async function initAuth() {
  if (!hasSupabase || !supabase) {
    currentUser = null;
    notify();
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  let user = session?.user ?? null;

  // Security check
  if (user && !isAllowedUser(user)) {
    await supabase.auth.signOut();
    user = null;
  }

  currentUser = user;
  notify();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    let user = session?.user ?? null;

    if (user && !isAllowedUser(user)) {
      await supabase.auth.signOut();
      user = null;
    }

    currentUser = user;
    notify();
  });
}

export async function signInWithDiscord() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

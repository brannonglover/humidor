# Analytics

Cavaro uses [PostHog](https://posthog.com) for product analytics. Events are sent via PostHog's capture API (no SDK required).

## Setup

1. Create a free account at [posthog.com](https://posthog.com)
2. Create a project and copy your **Project API Key** (starts with `phc_`)
3. Add to your environment:
   - **Local dev**: `EXPO_PUBLIC_POSTHOG_KEY=phc_xxx` in `.env.development` or `.env.development.local`
   - **EAS builds**: Add `EXPO_PUBLIC_POSTHOG_KEY` as an [EAS secret](https://docs.expo.dev/build-reference/variables/#using-secrets) or in your build profile env

If the key is not set, analytics are disabled (no-op). The app works normally without it.

## What's tracked

### Screen views (automatic)
- Tab navigation: Favorites, Dislikes, Cavaro, Search, Pairing
- Stack screens: CavaroList, AddCigar, EditCigar, Landing, Login, Signup

### Feature events
| Event | Properties |
|------|------------|
| `cigar_added` | `source` (catalog/custom), `quantity` |
| `cigar_edited` | — |
| `cigar_favorited` | — |
| `cigar_unfavorited` | — |
| `cigar_disliked` | — |
| `cigar_smoked` | — |
| `personal_notes_saved` | — |
| `strength_profile_saved` | — |
| `search_performed` | `keyword_count`, `has_results` |
| `add_from_search` | `brand`, `name` |
| `pairing_requested` | `has_result` |
| `landing_cta` | `action` (get_started/subscribe/already_have_account/restore_subscription) |
| `login_success` | — |
| `signup_success` | `tier` |

## User identification

When a user signs in (Supabase), their `user.id` is used as the distinct ID for analytics. Anonymous users are tracked with `distinct_id: 'anonymous'`.

# MeeNaradha V1 Product Specification

## Audience
Telugu moviegoers across Telugu-speaking markets and the global Telugu diaspora. The product supports Telugu, English, and a bilingual presentation model.

## Core content
News Articles, Movies, Celebrities, Reviews, OTT, Box Office, Image Galleries, Video Hub, Short Films, Top 10 / Trending, Polls and Contests.

## Language architecture
Content records use shared canonical IDs with Telugu and English fields. UI language can be switched without creating separate websites. Search must support Telugu/English names, aliases and common spellings.

## Movie Pulse
Movie Pulse is the signature audience interaction feature. A viewer selects a movie, optionally verifies a ticket, starts First Half, records reactions on a running timeline, pauses at Interval, starts Second Half, finishes, then sees My Pulse, Audience Pulse and You vs Audience.

Reactions: WOW, LOL, EDGE, TEAR, CRINGE, SNOOZE.

Aggregate audience reactions are hidden during an active viewing session and revealed after completion.

## CMS
Editorial workflow supports structured Movies, People, Companies, Articles, Galleries, Videos, Short Films, OTT, Reviews, Box Office, Polls, Contests and Movie Pulse administration. External imports require review before publication.

## Architecture
Cache-first public pages. Supabase is the source of truth for structured and dynamic data. Media should use object storage/CDN or approved embeds rather than the application server.

## V1 exclusions
Creator marketplace, crowdfunding, fan clubs, advanced AI recommendation assistant, web-series/reality-show Pulse and other new concepts remain future backlog unless explicitly promoted into V1.

---
status: Living
updated_at: "2026-09-27"
---

# Domain Context — blog

## Glossary

- Administrator — A signed-in person who manages categories, users, moderation, settings, statistics, role assignment, and the audit log, and does this only from the admin panel. NOT Moderator (a Moderator hides articles and comments, blocks users, handles complaints, and changes an article's category, and does not manage the catalog, roles, settings, statistics, or the audit log).
- Article — A piece of writing owned by one User, filed under exactly one Category, with its own Content language. It starts as a draft, becomes published, may be hidden by a Moderator, and may be soft-removed so readers no longer see it while the record remains. Revising a published Article keeps the previous version. NOT Category (a Category is the topic, not the piece). NOT Comment.
- Avatar — An optional image a User saves on their public profile. A Guest sees it after it is saved. NOT the image attached to an Article (that image belongs to the piece of writing).
- Biography — Optional public text a User saves on their profile. A Guest sees it after it is saved. NOT Article text (Article text is the piece of writing).
- Block — A Moderator or Administrator stopping a User from publishing, commenting, following, liking, bookmarking, and sending Direct messages. The blocked User can still read published material, edit their own Article, soft-remove their own Article, and file a Complaint, and is told the account is blocked. Articles that User already published stay visible. NOT Complaint (a Complaint asks for a decision on one piece of content). NOT one User muting another (that is outside this release).
- Bookmark — A private mark a User places on a published Article. Only that User can see their Bookmarks. There are no folders. NOT Like (a Like is visible as a count to other readers).
- Category — A topic an Administrator names and translates into English, Serbian Latin, and Russian. An Article belongs to exactly one Category. A User may follow a Category. NOT Article.
- Comment — A User's public remark on a published Article. It may reply to another Comment, receive a Like, mention a User, and be the subject of a Complaint. Replies past the third level remain stored and are shown flat. NOT Direct message (a Direct message is private between two Users).
- Complaint — A User's report of an Article or a Comment. It stays open until a Moderator or an Administrator hides that Article or Comment, or dismisses the report and leaves the piece visible. Both closings need a reason and are written on the audit log. NOT Block (a Block stops a User's actions and is not a decision on one piece of content).
- Content language — The language an Article is written in, chosen by its author from English, Serbian Latin, or Russian. Feeds show every Content language unless that User limits the list. Articles are not translated automatically. NOT Interface language.
- Direct message — A private message in a conversation of exactly two Users. It stays waiting if the recipient is away, the recipient gets an unread count, and the sender can see that it was read. NOT Comment.
- Display name — An optional public name a User saves on their profile. A Guest sees it after it is saved. NOT Username (a Username is required and unique).
- Follow — A User's subscription to another User or to a Category. Newly published Articles from those sources appear in that User's My feed. NOT Bookmark.
- Fresh feed — The list of published Articles, newest first, visible to a Guest and to a User. NOT Popular feed. NOT My feed.
- Guest — A person who is not signed in and may read published articles, categories, public profiles, comments, counters, and the public feed. NOT User (a User is signed in and may write, follow, react, bookmark, and send messages).
- Interface language — The language of menus, buttons, system text, and Notifications: English, Serbian Latin, or Russian. English is the fallback. Serbian is Latin only. NOT Content language.
- Like — One User's endorsement of one Article or one Comment. Repeating it removes that endorsement. People who are viewing the Article see the count change without reloading. NOT Bookmark. NOT View.
- Moderator — A signed-in person who hides articles and comments, blocks users, handles complaints, and changes an article's category, and does this only from the admin panel. NOT Administrator (an Administrator also manages the category catalog, users, roles, settings, statistics, and the audit log).
- My feed — The list of published Articles from Users and Categories a given User follows, newest first. Only a signed-in User has this list. NOT Fresh feed.
- Notification — An in-product notice to a User about a reply, a mention, a new follower, or a new Direct message. NOT an email and NOT a phone alert (those are outside this release).
- Popular feed — The list of published Articles ordered by a score of Views, Likes, Comments, Bookmarks, and age. An Administrator can change the weights. Visible to a Guest and to a User. NOT Fresh feed.
- Theme — The appearance choice light, dark, or system. System is the default and follows the device. The choice applies on the public site and on the admin panel. NOT Interface language.
- User — A signed-in person who is both a reader and an author; there is no separate author role. NOT Guest (a Guest is not signed in); NOT Moderator (a User cannot hide content, block people, or handle complaints).
- Username — The required public name a User chooses. No two Users share one. NOT Display name (a Display name is optional and need not be unique).
- View — A count added when an Article stays open and visible for a few seconds. The same viewer does not add another View for 30 minutes. A Guest is the same viewer for the same browser session. A User is the same viewer when that User returns. A Guest can add a View. NOT Like.

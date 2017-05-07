# auto-foe
This application does much repetitive work in internet game **Forge of Empires**.
Runs on the newest node.js server.

## Getting started
First, install dependencies:
```
npm install
```
Next need to provide your account settings in file ``userdata/settings.json``. After that run server by typing:
```
node server-start.js
```
### Structure of ``userdata/settings.json`` file
This is array of account settings:
* **loginType** — type of account, valid values are ``google`` for Google account, and ``game`` for in-game account.
* **username** — username, you know.
* **password** — base64 encrypted password. I know, this is not the ideal encryption, but feel free to fork this project and enhance this.
* **lang** — language of your *Forge of Empires* server (for example ``us`` for United States, ``pl`` for Poland, etc.).
* **world** — symbolic name of your world (for example ``us13`` is currently for *Noarsil*).
* **answer** — this field is for Google account only and this is the answer for security question sometimes asked while signing in Google account.

## What this application does
* Collecting production from all buildings.
* Starting production in all buildings.
* Spending strategy points for technologies and, if none of technology is available, for great buildings (yours or, if you don't have any, your friends).
* Creating market offers to make balance among goods from the same era. To be more specific, application sells those goods, for which you got raw good.
* Polivating/Motivating other players' buildings.
* Sitting down in your friends' taverns. Collecting tavern silver from your own tavern.
* Sending scout and collecting treasure chests.
* Sending scout to other provinces - currently disabled because it's not working properly in some situations.
* Paying off provinces.
* Collecting hidden items (if available during some events).

## Web *console*
There is a web console available after server started. It runs on port 3000. So if you ran the app on your local machine, the addres will be http://localhost:3000/.

## Final words
There are polish messages/comments in the code - sorry for that, but you should understand all from the code (I hope).

**Important**: Using of this application violates rules of the game, so you use it at your own risk.

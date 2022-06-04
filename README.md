# Uptime-Checker


A pure NodeJS app without use of Express, NPM, databases or any extensions.
Create your account, enter a URL, check in some details and get notified if the URL has a change in it's state (up->down/down->up). Each user can have up to five checks. 

Or use the CLI (Command Line Interface) as an administrator to check app related data:
1) Number of users
2) User info
3) Number of checks
4) Additional information on a specific check
5) Number of log files
6) Information contained in a specific log


Account is validated using tokens, each token has a validity time of 1 hour (duration of a session). Additionally, every time the server is started the exisitng log (.log) files are compressed to save space.



(NOTE: Create an https directory in the app's folder and create your SSL credentials to check uptime on links using https protocol)

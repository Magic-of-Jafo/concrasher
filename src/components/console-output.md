 npm run dev

> temp-next-app@0.1.0 dev
> next dev

  ▲ Next.js 14.2.3
  - Local:        http://localhost:3000
  - Environments: .env.local, .env

 ✓ Starting...
 ✓ Ready in 2.5s
 ○ Compiling / ...
 ✓ Compiled / in 4.1s (2678 modules)
prisma:query SELECT "public"."Convention"."id", "public"."Convention"."name", "public"."Convention"."slug", "public"."Convention"."startDate", "public"."Convention"."endDate", "public"."Convention"."city", "public"."Convention"."country", "public"."Convention"."venueName", "public"."Convention"."websiteUrl", "public"."Convention"."status"::text, "public"."Convention"."createdAt", "public"."Convention"."updatedAt", "public"."Convention"."stateAbbreviation", "public"."Convention"."stateName", "public"."Convention"."seriesId", "public"."Convention"."deletedAt", "public"."Convention"."coverImageUrl", "public"."Convention"."descriptionMain", "public"."Convention"."descriptionShort", "public"."Convention"."isOneDayEvent", "public"."Convention"."isTBD", "public"."Convention"."profileImageUrl", "public"."Convention"."guestsStayAtPrimaryVenue", "public"."Convention"."registrationUrl", "public"."Convention"."timezoneId", "public"."Convention"."keywords" FROM "public"."Convention" WHERE ("public"."Convention"."status" = CAST($1::text AS "public"."ConventionStatus") AND "public"."Convention"."deletedAt" IS NULL) ORDER BY "public"."Convention"."startDate" ASC OFFSET $2
prisma:query SELECT "public"."ConventionSeries"."id", "public"."ConventionSeries"."name", "public"."ConventionSeries"."description", "public"."ConventionSeries"."createdAt", "public"."ConventionSeries"."updatedAt", "public"."ConventionSeries"."organizerUserId", "public"."ConventionSeries"."logoUrl", "public"."ConventionSeries"."slug" FROM "public"."ConventionSeries" WHERE "public"."ConventionSeries"."id" IN ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36) OFFSET $37
prisma:query SELECT "public"."SEOSetting"."id", "public"."SEOSetting"."defaultKeywords", "public"."SEOSetting"."siteTitleTemplate", "public"."SEOSetting"."siteDescription", "public"."SEOSetting"."organizationName", "public"."SEOSetting"."organizationUrl", "public"."SEOSetting"."organizationLogo", "public"."SEOSetting"."socialProfiles", "public"."SEOSetting"."trackingScripts", "public"."SEOSetting"."updatedAt" FROM "public"."SEOSetting" WHERE "public"."SEOSetting"."id" IN ($1,$2) OFFSET $3
🔍 Layout: Rendering TrackingScripts component for tag: <script type="text/javascript">     (function(c,l,a,r,i,t,y){         
c[a]=c[a]||function(){(c[a].q=...
🔍 Layout: Rendering TrackingScripts component for tag: <script>
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){
      n.callMethod ? n....
🔍 TrackingScripts: Component rendered with scripts: Scripts present
🔍 TrackingScripts: Current pathname: /
🔍 TrackingScripts: About to render script with content length: 335
🔍 TrackingScripts: Component rendered with scripts: Scripts present
🔍 TrackingScripts: Current pathname: /
🔍 TrackingScripts: About to render script with content length: 815
 GET / 200 in 5912ms
 ○ Compiling /_not-found ...
 ✓ Compiled /api/auth/session in 1414ms (2681 modules)
 ✓ Compiled in 2ms (1623 modules)
 ✓ Compiled in 601ms (2938 modules)
prisma:query SELECT "public"."SEOSetting"."id", "public"."SEOSetting"."defaultKeywords", "public"."SEOSetting"."siteTitleTemplate", "public"."SEOSetting"."siteDescription", "public"."SEOSetting"."organizationName", "public"."SEOSetting"."organizationUrl", "public"."SEOSetting"."organizationLogo", "public"."SEOSetting"."socialProfiles", "public"."SEOSetting"."trackingScripts", "public"."SEOSetting"."updatedAt" FROM "public"."SEOSetting" WHERE "public"."SEOSetting"."id" IN ($1,$2) OFFSET $3
prisma:query SELECT "public"."SEOSetting"."id", "public"."SEOSetting"."defaultKeywords", "public"."SEOSetting"."siteTitleTemplate", "public"."SEOSetting"."siteDescription", "public"."SEOSetting"."organizationName", "public"."SEOSetting"."organizationUrl", "public"."SEOSetting"."organizationLogo", "public"."SEOSetting"."socialProfiles", "public"."SEOSetting"."trackingScripts", "public"."SEOSetting"."updatedAt" FROM "public"."SEOSetting" WHERE "public"."SEOSetting"."id" IN ($1,$2) OFFSET $3
🔍 Layout: Rendering TrackingScripts component for tag: <script type="text/javascript">     (function(c,l,a,r,i,t,y){         
c[a]=c[a]||function(){(c[a].q=...
🔍 Layout: Rendering TrackingScripts component for tag: <script>
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){
      n.callMethod ? n....
🔍 Layout: Rendering TrackingScripts component for tag: <script type="text/javascript">     (function(c,l,a,r,i,t,y){         
c[a]=c[a]||function(){(c[a].q=...
🔍 Layout: Rendering TrackingScripts component for tag: <script>
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){
      n.callMethod ? n....
--- [JWT Callback] Start ---
[JWT] Trigger: undefined
[JWT] Initial Token: {
  name: '',
  email: 'magicjafo@gmail.com',
  picture: null,
  sub: 'cmd80awrn0000eib87ynccft2',
  id: 'cmd80awrn0000eib87ynccft2',
  roles: [ 'USER' ],
  iat: 1752794039,
  exp: 1755386039,
  jti: '6d48c015-28ae-4891-a9d3-3ec6007caa5c'
}
[JWT] User object from authorize: undefined
[JWT] Fetching user from DB with token.id: cmd80awrn0000eib87ynccft2
🔍 TrackingScripts: Component rendered with scripts: Scripts present
🔍 TrackingScripts: Current pathname: /.well-known/appspecific/com.chrome.devtools.json
🔍 TrackingScripts: About to render script with content length: 335
🔍 TrackingScripts: Component rendered with scripts: Scripts present
🔍 TrackingScripts: Current pathname: /.well-known/appspecific/com.chrome.devtools.json
🔍 TrackingScripts: About to render script with content length: 815
prisma:query SELECT "public"."Convention"."id", "public"."Convention"."name", "public"."Convention"."slug", "public"."Convention"."startDate", "public"."Convention"."endDate", "public"."Convention"."city", "public"."Convention"."country", "public"."Convention"."venueName", "public"."Convention"."websiteUrl", "public"."Convention"."status"::text, "public"."Convention"."createdAt", "public"."Convention"."updatedAt", "public"."Convention"."stateAbbreviation", "public"."Convention"."stateName", "public"."Convention"."seriesId", "public"."Convention"."deletedAt", "public"."Convention"."coverImageUrl", "public"."Convention"."descriptionMain", "public"."Convention"."descriptionShort", "public"."Convention"."isOneDayEvent", "public"."Convention"."isTBD", "public"."Convention"."profileImageUrl", "public"."Convention"."guestsStayAtPrimaryVenue", "public"."Convention"."registrationUrl", "public"."Convention"."timezoneId", "public"."Convention"."keywords" FROM "public"."Convention" WHERE ("public"."Convention"."status" = CAST($1::text AS "public"."ConventionStatus") AND "public"."Convention"."deletedAt" IS NULL) ORDER BY "public"."Convention"."startDate" ASC OFFSET $2
prisma:query SELECT "public"."ConventionSeries"."id", "public"."ConventionSeries"."name", "public"."ConventionSeries"."description", "public"."ConventionSeries"."createdAt", "public"."ConventionSeries"."updatedAt", "public"."ConventionSeries"."organizerUserId", "public"."ConventionSeries"."logoUrl", "public"."ConventionSeries"."slug" FROM "public"."ConventionSeries" WHERE "public"."ConventionSeries"."id" IN ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36) OFFSET $37
prisma:query SELECT "public"."User"."id", "public"."User"."image", "public"."User"."roles"::text[], "public"."User"."firstName", "public"."User"."lastName", "public"."User"."stageName" FROM "public"."User" WHERE ("public"."User"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3
[JWT] DB user fetched: null
[JWT] DB user not found. Invalidating token.
--- [JWT Callback] End ---
 GET /api/auth/session 401 in 2222ms
 GET /.well-known/appspecific/com.chrome.devtools.json 404 in 3213ms
--- [JWT Callback] Start ---
[JWT] Trigger: undefined
[JWT] Initial Token: {
  name: '',
  email: 'magicjafo@gmail.com',
  picture: null,
  sub: 'cmd80awrn0000eib87ynccft2',
  id: 'cmd80awrn0000eib87ynccft2',
  roles: [ 'USER' ],
  iat: 1752794039,
  exp: 1755386039,
  jti: '6d48c015-28ae-4891-a9d3-3ec6007caa5c'
}
[JWT] User object from authorize: undefined
[JWT] Fetching user from DB with token.id: cmd80awrn0000eib87ynccft2
prisma:query SELECT "public"."User"."id", "public"."User"."image", "public"."User"."roles"::text[], "public"."User"."firstName", "public"."User"."lastName", "public"."User"."stageName" FROM "public"."User" WHERE ("public"."User"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3
[JWT] DB user fetched: null
[JWT] DB user not found. Invalidating token.
--- [JWT Callback] End ---
 GET /api/auth/session 401 in 146ms
 ✓ Compiled /api/auth/[...nextauth] in 498ms (1625 modules)
 POST /api/auth/_log 200 in 758ms
 POST /api/auth/_log 200 in 1078ms

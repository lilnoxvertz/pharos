## SETUP

1. ```bash
   npm install
   ```
2. fill proxy.txt if u have proxy (format should be either ip:port:username:passord or ip:port)

3. fill wallet.txt with privateKey,address

4. fill recipient.txt with wallet address that u wanted to send tokens or just use the one provided

5. go to config/config.js and change this line value to any amount that u want
   ```bash
   maxCycleConfig = 5
   ```

## COMMAND

- GENERATE WALLET

1. go to src>main>generate.wallet.js and change the amount, then run this command
   ```bash
   npm run generate
   ```

- CHECK-IN

  ```bash
  npm run cekin
  ```

- CLAIMING FAUCET

1.  claiming pharos faucet (u needed to connect ur X account for it to be successs)

   ```bash
   npm run faucet
   ```

2. claiming zenith usdt and usdc [PATCHED]

   ```bash
   npm run zenith
   ```

- SENDING TOKEN TO WALLET

  ```bash
  npm run send
  ```

- SWAPPING
  ```bash
  npm run swap
  ```
- ADDING LIQUIDITY
  ```bash
  npm run liq
  ```
- SHOWING POINTS
  ```bash
  npm run point
  ```

## NOTE

for referral, go to config.js and change the referralCode with yours

## SUPPORT DEV BUAT BELI GACOAN DAN UDANG KEJU https://trakteer.id/noxxx7

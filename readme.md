## SETUP

1. ```bash
   npm install
   ```
2. fill proxy.txt if u have proxy (format should be either ip:port:username:passord or ip:port)

3. fill wallet.txt with your private key

4. fill recipient.txt with wallet address that u wanted to send tokens or just use the one provided

5. go to config/config.js and go to line 26. change it to any amount that you want. this line decided about how much success transaction that was needed before proceeding to complete another task.

   ```json
   const maxSuccessTransaction = 10
   ```

## COMMAND

- COMPLETING DAILY TASK
  this command will automatically run every task like claiming faucet, checking in, swapping, sending, and adding liquidity. it will stop if you close or stop the bot

  ```bash
  npm start
  ```

- CHECKING WALLET DATA

  ```bash
  npm run data
  ```

- GENERATE WALLET

1. go to src > main > generate.wallet.js and change the amount, then run this command

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

## SETUP

- clone the repo
  `bash
 gitclone https://github.com/lilnoxvertz/pharos.git
`

- install the package
  `bash
 npm install
`

- fill everything in this file
  wallet.txt: fill with your private key
  proxy.txt: fill with your proxy (format should be either ip:port:username:passord or ip:port)
  twitterUsername.txt: fill with anyone twitter username

- setup for task
  go to src/transaction/config.js

  set any value to true if you want to work on that task, and false to skip it
  `json
const tasks = {
    faucet: true,
    checkin: true,
    send: {
        pharos: true,
        primus: true
    },
    swap: {
        zenith: true,
        faroswap: true,
    },
    liq: {
        zenith: true,
        faroswap: true
    }
}
`
  and set the value of this code to determine how many transaction should the address do
  `bash
 const transactionLimitConfig = 10
`

## COMMAND

- main task (swap, checkin, liq, faucet)
  note that this command will do an infinite loop.

`bash
 npm start
`

- minting nft (grandline)

`bash
 npm run nft
`

- minting domain (pns)

`bash
 npm run domain
`

- generating wallet

`bash
 npm run generate
`

## NOTE

for referral, go to config.js and change the referralCode with yours

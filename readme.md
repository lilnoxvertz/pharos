## SETUP

# clone the repo
  `
 gitclone https://github.com/lilnoxvertz/pharos.git
`

# install the package
  `
 npm install
`

# fill everything in this file
 - wallet.txt: fill with your private key
 - proxy.txt: fill with your proxy (format should be either ip:port:username:passord or ip:port)
 - twitterUsername.txt: fill with anyone twitter username

# setup for task
  go to src/transaction/config.js

  set any value to true if you want to work on that task, and false to skip it
```json
{
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
    },
    rwa: {
        aquaflux: true
    }
}
```
  and set the value of this code to determine how many transaction should the address do
  `
 const transactionLimitConfig = 10
`

  and set the value for this code to anything you want
  `
  const minValue = 1 
  const maxValua = 5
`

## COMMAND

- main task (swap, checkin, liq, faucet)
  note that this command will do an infinite loop.

`
 npm start
`

- minting nft (grandline)

`
 npm run nft
`

- minting domain (pns)

`
 npm run domain
`

- generating wallet

`
 npm run generate
`

## NOTE

for referral, go to config.js and change the referralCode with yours

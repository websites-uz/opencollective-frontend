# Collectives API

## Get info

Get detailed information about a collective:

`/:collectiveSlug.json`

E.g.: https://opencollective.com/webpack.json

```json
{
  "slug": "webpack",
  "currency": "USD",
  "image": "https://cl.ly/221T14472V23/icon-big_x6ot1e.png",
  "balance": 7614777,
  "yearlyIncome": 28499262,
  "backersCount": 556,
  "contributorsCount": 1098
}
```

Notes:

- `image` is the logo of the collective
- all amounts are in the smaller unit of the currency (cents)
- `backersCount` includes both individual backers and organizations (sponsors)
- `yearlyIncome` is the projection of the annual budget based on previous donations and monthly pledges
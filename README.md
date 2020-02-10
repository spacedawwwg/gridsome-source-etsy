# gridsome-source-etsy
> Simple Etsy products source for Gridsome.

## Install
- `yarn add gridsome-source-etsy`
- `npm install gridsome-source-etsy`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: 'gridsome-source-etsy',
      options: {
        shopId: 'ETSY_SHOP_ID', // required
        token: 'ETSY_API_TOKEN', // required
        typeName: 'Etsy',
      }
    }
  ],
  templates: {
    EtsyProduct: '/:slug'
  }
}
```

## Example Query

```
<page-query>
query {
  allEtsyProduct(filter:{ state: { eq:"active" } } ) {
    edges {
      node {
        id
        state
        listingId
        title
        price
        currencyCode
        path
        url
        slug
        images {
          url_fullxfull
          full_height
          full_width
        }
        description
      }
    }
  }
}
</page-query>
```

## Helpful links
- How to get your Etsy shop ID: https://support.cartrover.com/portal/kb/articles/how-to-get-your-etsy-shop-id
- Register for Etsy API token: https://www.etsy.com/developers/documentation/getting_started/register



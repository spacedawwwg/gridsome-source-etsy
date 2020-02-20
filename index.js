const axios = require('axios');
const Jimp = require('jimp');
const camelCase = require('camelcase');
const { isPlainObject } = require('lodash');
const decodeEntities = require('decode-entities');
const readline = require('readline');

class EtsySource {
  static defaultOptions() {
    return {
      storeId: null,
      token: null,
      typeName: 'Etsy',
      lqip: false
    };
  }

  constructor(api, options) {
    this.options = options;

    if (!options.shopId) {
      throw new Error(`Missing shopId option.`);
    }

    if (!options.token) {
      throw new Error(`Missing token option.`);
    }

    this.client = axios.create({
      baseURL: `https://openapi.etsy.com/v2`
    });

    api.loadSource(async store => {
      this.store = store;

      console.log(`Loading data from Etsy`);

      await this.getProducts(store, options);
    });
  }

  async getProducts(store, options) {
    const { data } = await this.fetch(
      `/shops/${options.shopId}/listings/active?api_key=${options.token}`
    );

    const products = store.addCollection({
      typeName: this.createTypeName(`Product`)
    });

    console.log(`Loading image(s) data from Etsy`);
    for (const [productIndex, product] of data.results.entries()) {
      const fields = this.normalizeFields(product);
      const imagesReq = await this.fetch(
        `/private/listings/${fields.listingId}/images?api_key=${options.token}`
      );
      const images = [...imagesReq.data.results];
      if (options.lqip) {
        for await (const [imageIndex, image] of imagesReq.data.results.entries()) {
          for await (let [key, value] of Object.entries(image)) {
            if (key.startsWith('url_570xN')) {
              readline.clearLine(process.stdout);
              readline.cursorTo(process.stdout, 0);
              process.stdout.write(`Generating lqip's (Etsy product ${productIndex+1} of ${data.results.length}, image ${imageIndex+1} of ${imagesReq.data.results.length})...`);
              const thumbReq = await Jimp.read(value);
              const thumbResized = await thumbReq.resize(15, Jimp.AUTO);
              const base64 = await thumbResized.getBase64Async('image/png');
              image['lqip'] = base64;
            }
          }
        }
        if (productIndex + 1 === data.results.length) {
          process.stdout.write(`\n`);
        }
      }
      products.addNode({
        ...fields,
        images: images,
        slug: this.stringToSlug(fields.title)
      });
    }
  }

  async fetch(url, params = {}, fallbackData = []) {
    let res;

    try {
      res = await this.client.request({ url, params });
    } catch ({ response, code, config }) {
      if (!response && code) {
        throw new Error(`${code} - ${config.url}`);
      }

      console.log(response);
      const { url } = response.config;
      const { status } = response.data.data;

      if ([401, 403].includes(status)) {
        console.warn(`Error: Status ${status} - ${url}`);
        return { ...response, data: fallbackData };
      } else {
        throw new Error(`${status} - ${url}`);
      }
    }

    return res;
  }

  normalizeFields(fields) {
    const res = {};

    for (const key in fields) {
      if (key.startsWith('_')) continue; // skip links and embeds etc
      res[camelCase(key)] = this.normalizeFieldValue(fields[key]);
    }

    return res;
  }

  normalizeFieldValue(value) {
    if (value === null) return null;
    if (value === undefined) return null;

    if (Array.isArray(value)) {
      return value.map(v => this.normalizeFieldValue(v));
    }

    if (isPlainObject(value)) {
      return this.normalizeFields(value);
    }

    return value;
  }

  createTypeName(name = '') {
    return camelCase(`${this.options.typeName} ${name}`, { pascalCase: true });
  }

  stringToSlug(str) {
    str = decodeEntities(str);
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
    var to = 'aaaaeeeeiiiioooouuuunc------';
    for (var i = 0, l = from.length; i < l; i++) {
      str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str
      .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
      .replace(/\s+/g, '-') // collapse whitespace and replace by -
      .replace(/-+/g, '-'); // collapse dashes

    return str;
  }
}

module.exports = EtsySource;

const { search } = require('duck-duck-scrape');

async function test() {
  const res = await search('site:alfatah.pk butter');
  console.log('Alfatah:', res.results.slice(0, 3).map(r => ({ title: r.title, url: r.url })));
  
  const res2 = await search('site:chefiality.pk chocolate');
  console.log('Chefiality:', res2.results.slice(0, 3).map(r => ({ title: r.title, url: r.url })));
}

test();

function addSearchEngine() {
  var searchEngine = {
    name: "Kurozora",
    keyword: "keyword",
    template: "https://kurozora.app/search?q={searchTerms}",
    iconURL: "https://kurozora.app/favicon.ico",
    suggestURL: "",
    searchForm: "https://kurozora.app/search"
  };
  window.external.AddSearchProvider(JSON.stringify(searchEngine));
}

if (window.external && typeof window.external.AddSearchProvider === 
"function") {
  addSearchEngine();
}

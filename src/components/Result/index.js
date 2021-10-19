import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Spinner from "../Spinner";


function keywordInRowFilter (keyword) {
    return row => row.some(word => word.includes(keyword));
}

export default function Result (props) {
  const {spreadsheetData} = props;
  const inputRef = useRef();
  const [showIntro, setShowIntro] = useState(true);
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const [searchHistory, setSearchHistory] = useState({});
  const [searchResult, setSearchResult] = useState(null);
  const [search, setSearch] = useState("");
  const pushSearchHistory = useCallback((key, value) => setSearchHistory(prevSearchHistory => ({...prevSearchHistory, [key]: value})), []);
  const onSearchChange = useCallback(event => { setShowIntro(false); setSearch(event.target.value); }, []);

  const generalSearch = useCallback(keyword => {
      return spreadsheetData.filter(keywordInRowFilter(keyword));
  }, [spreadsheetData]);

  /**
   * Check if the current keyword exist in search history.
   * @param {string} keyword - The searching keyword which is tried to be found
   * in history.
   * @returns {Array|null}
   */
  const historySearch = useMemo (() => {
    // Check if part of the keyword exists in the `searchHistory` map.
    const searchHistoryWords = Object.keys(searchHistory);

    return keyword => {

      // Try to find the exact same keyword in history
      if (searchHistory.hasOwnProperty(keyword)) { return searchHistory[keyword]; }

      // Check if part of the current keyword exists in history, it still does reducing the searching time.
      const potentialMatchKeyword = searchHistoryWords.find(word => keyword.includes(word));
      if (potentialMatchKeyword) {
        const rows = searchHistory[potentialMatchKeyword];
        const results = rows.filter(keywordInRowFilter(keyword));
        if (results.length > 0) { return results; }
      }

      return null;
    };
  }, [searchHistory]);

  const keywordSearch = useCallback(keyword => {
    const historySearchedRows = historySearch(keyword);
    if (Array.isArray(historySearchedRows)) {
      return historySearchedRows;
    } else {
      const generalSearchRows = generalSearch(keyword);
      return generalSearchRows;
    }
  }, [pushSearchHistory, generalSearch, historySearch]);

  useEffect(() => {

    const timeoutId = window.setTimeout(() => {
      if (search.trim() !== "") {
        const result = keywordSearch(search);
        pushSearchHistory(search, result);
        setSearchResult(result);
      } else {
        setSearchResult(null);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const el = inputRef.current;
    if (el instanceof Element) { setPlaceholderHeight(el.getBoundingClientRect().height); }
  }, []);

  return (
    <div className="result">
      <div className="result__input" ref={inputRef}>
        <div className="container">
          <input value={search} onChange={onSearchChange} placeholder="검색 搜尋" />
        </div>
      </div>
      <div className="container">
        <div className="result__placeholder" style={{height: placeholderHeight}} />
        {
          showIntro ? (
            <div className="result__intro">
                Intro
            </div>
          ) : null
        }
        {Array.isArray(searchResult) ? (
          <table className="result__table">
            <tbody>
              {searchResult.slice(0, 100).map((row, index) => {
                return (
                  <tr key={index}><td>
                    {row.map((word, index) => {
                      const output = word.split(search).map((segment, index, arr) => {
                        if (arr.length - 1 === index) { return segment; }
                        return <React.Fragment key={index}>{segment}<div className="result__highlight">{search}</div></React.Fragment>;
                      });
                      if (index === 0) { return (<code key={index} className="result__word result__word--chinese">{output}</code>); }
                      return (<div key={index} className="result__word result__word--korean">{output}</div>);
                    })}
                  </td></tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
        {Array.isArray(searchResult) && searchResult.length > 100 ? <center><code>{`總共有${searchResult.length}相關字詞，顯示首100個結果`}</code><br /><br /></center> : null}
      </div>
    </div>
  );
}

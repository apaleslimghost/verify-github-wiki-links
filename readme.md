# verify-github-wiki-links

a tool to verify that internal links in a github wiki are valid

## running

```sh
npx @quarterto/verify-github-wiki-links example/github-repo
```

the script will clone the repo's wiki to a temporary folder, parse all the links out of the markdown, and for each link that doesn't match a file in the wiki it'll ask you which page it should link to instead, suggesting the five closest matches to the current link.

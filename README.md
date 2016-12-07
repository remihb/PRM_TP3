# PRM TP3 Ex2


Regarder le fichier `TP002_fichier clients V2016_a-dedoublonner.ods`

# PRM TP3 Ex3

### Prérequis
- installer Node.js

### Lancement
Après la récupération du projet, à la racine exécutez :
```
# installation des packages Node
> npm install

# lancement du classement des pdfs
> node index.js
```

Les pdfs sont analysés, triés et conservés en exemplaire unique dans `stages_uniques`.

### Outils et méthodes

- Technologie Node.js
- Utilisation du node module `pdf-text-extract`
- Utilisation du node module `compute-cosine-similarity`
- Programmation sous forme de Promise


#### Parsage des pdfs

Dans un premier temps, on récupère le contenu des pdfs grâce au module `pdf-text-extract` qui permet de parser le contenu au format string.

#### Modèle vectoriel

On définit un dictionnaire de mots  
__[abandonner, abattre, abri, ... , libre, lien, lier, ... , vue, yeux]__

Puis on créé la signature vectorielle V0 de ce vocabulaire T0, qui va être un vecteur à N dimensions *(N=T0.length)* ou pour tout k=1..N, V0[k]=1, car chaque mot du dictionnaire apparaît par définition une fois.

Un fois ce vecteur obtenu, on va calculer la signature vectorielle de chaque pdf à partir de ce vocabulaire de référence en regardant si les mots du vocabulaire apparaissent dans le contenu du pdf.
On obtient alors un vecteur propre à chaque mail qui sera du type [1,0,0,0,1,1,0,...,0,1]

Autrement dit, __soit Ti le texte du pdf Pi, si V0[j]⊂Pi, alors Vi[j]=1, sinon Vi[j]=0 ou Vi est le vecteur de Pi__


#### Classement

Une fois obtenues les signatures vectorielles de tous les pdfs, il suffit de calculer le coefficient du cosinus et renormaliser afin d'obtenir un angle d'écart entre une signature vectorielle donnée et le vecteur du vocabulaire de référence

![Alt text](https://cdn.rawgit.com/compute-io/cosine-similarity/bdef940bf4e6d320d2652b52f54f58cf2ea5d794/docs/img/eqn_similarity.svg "formule de la similarité cosinusal") __= cosϴ__

Grâce au module `compute-cosine-similarity`, on obtient une valeur pour cosϴ comprise entre 0 et 1 pour chaque signature vectorielle de pdf, __*et plus on se rapproche de 0, plus les vecteurs sont orthogonaux et plus on se rapproche de 1 et plus ils sont colinéaires*__, autrement dit plus le coefficient est élevé, plus le contenu du pdf comprend des éléments du vocabulaire de référence.


#### Tri

Si l'on prend deux pdfs ayant une signature vectorielle identique, cela ne signifie pas que le contenu des pdfs est identique mais qu'il contient les mêmes mots issus du vocabulaire de référence.  
__à l'inverse, si deux pdfs ont une signature vectorielle différente, on est absolument certain que leur contenu est différent.__

On regroupe alors les pdfs par signature vectorielle identique. On obtient un tableau de tableaux de la forme :
```
{
    '0.1837072025790769' : [
        'Stage CGI Rennes - STRNSMAP02.pdf',
        'Stage developpement web.pdf'
    ],
    '0.19493949692028945' :[
        'Sujet de stage CHRU Brest - Interface requêtage.pdf'
    ],
    '0.34178815288082076' :[
        'Sujet de stage CHRU de BREST - Interface de restitution.pdf',
        'nsmail-10.pdf',
        'stage_M2_Gysela_FTI.pdf'
    ]
}
```

Il ne reste plus qu'à comparer les contenus des pdfs deux à deux pour chaque signature vectorielle identique. Ici par exemple, on va comparer les 3 pdfs ayant la signature vectorielle `0.34178815288082076` l'un avec l'autre.  

Lorsque deux pdfs ont un contenu identique, on supprime l'un des deux. On obtient alors un tableau pdfs unique sur leur contenu pour chaque signature vectorielle.

Il ne reste plus qu'à concaténer chaque tableau unique ainsi obtenu pour chaque signature vectorielle et on a une liste de pdfs sans duplicata.

#### Résultats

Avec cette méthode de calcul, on accelère le tri des pdfs puisque la complexité n'est plus de __N²__. En effet, on compare deux à deux seulement les pdfs possédants la même signature vectorielle, donc qui a priori possède des contenus très semblables.

- __pdfs originaux &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : 4,184__
- __pdfs sans suplicata : 3,688__
	- 496 duplicatas


#### Temps d'exécution ≃ 40,000ms

const Cigar = require('../models/Cigar');
const Favorites = require('../models/Favorites');

const {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLSchema,
  GraphQLList,
} = require('graphql');

const FavoriteType = new GraphQLObjectType({
  name: 'Favorite',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    brand: { type: GraphQLString },
    description: { type: GraphQLString },
    wrapper: { type: GraphQLString },
    binder: { type: GraphQLString },
    filler: { type: GraphQLString },
    image: { type: GraphQLString },
    size: { type: GraphQLString }
  })
});

const SizeType = new GraphQLObjectType({
  name: 'Size',
  fields: () => ({
    length: { type: GraphQLString },
    image: { type: GraphQLString }
  })
})

const CigarType = new GraphQLObjectType({
  name: 'Cigar',
  fields: () => ({
    id: { type: GraphQLID },
    binder: { type: GraphQLString },
    brand: { type: GraphQLString },
    description: { type: GraphQLString },
    filler: { type: GraphQLString },
    image: { type: GraphQLString },
    name: { type: GraphQLString },
    wrapper: { type: GraphQLString },
    size: { type: new GraphQLList(SizeType) }
  })
});

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    cigars: {
      type: new GraphQLList(CigarType),
      resolve (parent, args) {
        return Cigar.find();
      }
    },
    cigar: {
      type: CigarType,
      args: { id: { type: GraphQLID } },
      resolve(parent, args) {
        return Cigar.findById(args.id); 
      }
    },
    favorites: {
      type: new GraphQLList(FavoriteType),
      resolve(parent, args) {
        return Favorites.find();
      }
    },
    favorite: {
      type: FavoriteType,
      resolve(parent, args) {
        return Favorites.findById(args.id);
      }
    }
  }
});

const mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addCigar: {
      type: FavoriteType,
      args: {
        name: { type: GraphQLString },
        brand: { type: GraphQLString },
        description: { type: GraphQLString },
        wrapper: { type: GraphQLString },
        binder: { type: GraphQLString },
        filler: { type: GraphQLString },
        size: { type: GraphQLString },
        image: { type: GraphQLString },
      },
      resolve(parent, args) {
        let cigar = new Favorites({
          name: args.name,
          brand: args.brand,
          description: args.description,
          wrapper: args.wrapper,
          binder: args.binder,
          filler: args.filler,
          size: args.size,
          image: args.image,
        });
        return cigar.save();
      }
    }
  }
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation
})
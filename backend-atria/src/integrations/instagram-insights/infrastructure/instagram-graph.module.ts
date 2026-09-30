import { Module } from '@nestjs/common';
import { InstagramGraphClient } from './instagram-graph.client';
import { MetaPageAccessTokenResolver } from './meta-page-access-token.resolver';

@Module({
  providers: [InstagramGraphClient, MetaPageAccessTokenResolver],
  exports: [InstagramGraphClient, MetaPageAccessTokenResolver],
})
export class InstagramGraphModule {}
